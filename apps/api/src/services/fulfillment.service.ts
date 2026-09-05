import {
  prisma,
  FulfillmentStatus,
  ShipmentStatus,
  BackorderStatus,
  StockMovementType,
  QuoteStage,
  CategoryType,
  type Prisma,
} from "@repo/db";
import { AppError } from "../middleware/error.js";
import { splitLine, type WarehouseCandidate } from "../lib/fulfillment-engine.js";
import { adjustStock } from "./warehouse.service.js";
import type {
  CreateFulfillmentOrderInput,
  UpdateShipmentStatusInput,
} from "../schemas/fulfillment.schema.js";

// =============================================================================
// Helper ID / Number Generators
// =============================================================================

async function generateFulfillmentNumber(tx: Prisma.TransactionClient, orgId: string): Promise<string> {
  const count = await tx.fulfillmentOrder.count({ where: { organizationId: orgId } });
  const year = new Date().getFullYear();
  let num = `FUL-${year}-${String(count + 1).padStart(4, "0")}`;
  const existing = await tx.fulfillmentOrder.findFirst({
    where: { fulfillmentNumber: num, organizationId: orgId },
  });
  if (existing) {
    num = `FUL-${year}-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return num;
}

// =============================================================================
// Phase 1: The Auto-Split Allocation Engine
// =============================================================================

export interface AutoSplitInput {
  quotationId?: string;
  fulfillmentOrderId?: string;
  notes?: string;
}

/**
 * Phase 1: Waterfall Allocation Engine.
 *
 * Triggered when a Quotation moves to the CONFIRMED stage or invoked directly via API.
 * 1. Processes QuotationLine items where itemType === "HARDWARE".
 * 2. Queries active Warehouses and StockLevels.
 * 3. Sorts candidate warehouses by:
 *    a) Single-shipment 100% capacity capability.
 *    b) Admin shippingCostWeight (ascending).
 *    c) Available stock volume tie-breaker.
 * 4. Creates parent FulfillmentOrder, Shipments, ShipmentLines, and reserves stock atomically.
 * 5. Creates Backorder records for any remaining deficit.
 */
export async function autoSplitFulfillment(orgId: string, input: AutoSplitInput) {
  let quotationId = input.quotationId;
  let fulfillmentOrderId = input.fulfillmentOrderId;

  if (!quotationId && !fulfillmentOrderId) {
    throw new AppError(400, "BAD_REQUEST", "Either quotationId or fulfillmentOrderId must be provided.");
  }

  // Retrieve quotation and verify stage
  let quotation = null;
  if (quotationId) {
    quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, organizationId: orgId },
      include: {
        customer: true,
        lines: {
          include: { product: true, variant: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  } else if (fulfillmentOrderId) {
    const fo = await prisma.fulfillmentOrder.findFirst({
      where: { id: fulfillmentOrderId, organizationId: orgId },
      include: {
        quotation: {
          include: {
            customer: true,
            lines: {
              include: { product: true, variant: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });
    if (fo) {
      quotation = fo.quotation;
      quotationId = fo.quotationId;
    }
  }

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  if (
    quotation.stage !== QuoteStage.CONFIRMED &&
    quotation.stage !== QuoteStage.APPROVED
  ) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      `Auto-split allocation can only be executed for CONFIRMED or APPROVED quotations (current stage: ${quotation.stage}).`
    );
  }

  // Filter ONLY physical hardware lines for warehouse fulfillment
  const hardwareLines = quotation.lines.filter(
    (l) => l.itemType === CategoryType.HARDWARE
  );

  if (hardwareLines.length === 0) {
    throw new AppError(
      400,
      "NO_PHYSICAL_GOODS",
      "Quotation has no physical hardware lines requiring warehouse fulfillment."
    );
  }

  // Retrieve active warehouses
  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { shippingCostWeight: "asc" },
  });

  if (warehouses.length === 0) {
    throw new AppError(400, "NO_ACTIVE_WAREHOUSES", "No active warehouses found for this organization.");
  }

  const warehouseCandidates: WarehouseCandidate[] = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    shippingCostWeight: w.shippingCostWeight ?? 1.0,
  }));

  const productIds = hardwareLines.map((l) => l.productId);
  const stockLevels = await prisma.stockLevel.findMany({
    where: {
      warehouseId: { in: warehouses.map((w) => w.id) },
      productId: { in: productIds },
    },
  });

  // Build stock lookup map: productId -> (warehouseId -> unreserved available quantity)
  const stockByProductAndWarehouse = new Map<string, Record<string, number>>();
  for (const sl of stockLevels) {
    if (!stockByProductAndWarehouse.has(sl.productId)) {
      stockByProductAndWarehouse.set(sl.productId, {});
    }
    const available = Math.max(0, sl.quantityOnHand - sl.quantityReserved);
    stockByProductAndWarehouse.get(sl.productId)![sl.warehouseId] = available;
  }

  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    // 1. Get or create parent FulfillmentOrder
    let parentFulfillmentOrder = await tx.fulfillmentOrder.findFirst({
      where: { quotationId: quotation.id, organizationId: orgId },
      include: { shipments: true, backorders: true },
    });

    if (!parentFulfillmentOrder) {
      const fulfillmentNumber = await generateFulfillmentNumber(tx, orgId);
      const shippingAddress =
        quotation.customer.shippingAddress ||
        quotation.customer.billingAddress ||
        "Default Customer Delivery Address";

      parentFulfillmentOrder = await tx.fulfillmentOrder.create({
        data: {
          fulfillmentNumber,
          quotationId: quotation.id,
          organizationId: orgId,
          status: FulfillmentStatus.PENDING,
          shippingAddress,
          notes: input.notes || `Waterfall auto-split created for confirmed quotation ${quotation.quoteNumber}`,
        },
        include: { shipments: true, backorders: true },
      });
    }

    // Map of warehouseId -> Shipment data accumulator
    const warehouseShipmentMap = new Map<
      string,
      {
        warehouseId: string;
        warehouseName: string;
        shippingCostWeight: number;
        lines: Array<{
          quotationLineId: string;
          productId: string;
          variantId: string | null;
          productName: string;
          sku: string;
          quantity: number;
        }>;
        totalEstimatedCost: number;
      }
    >();

    const backorderRecords: Array<{
      quotationLineId: string;
      productId: string;
      variantId: string | null;
      productName: string;
      sku: string;
      quantityBackordered: number;
    }> = [];

    const lineAllocationSummary = [];

    // 2. Execute Waterfall Allocation for each Hardware line
    for (const line of hardwareLines) {
      const productStock = stockByProductAndWarehouse.get(line.productId) || {};
      const splitResult = splitLine(line.quantity, warehouseCandidates, productStock);

      lineAllocationSummary.push({
        quotationLineId: line.id,
        productId: line.productId,
        productName: line.product.name,
        sku: line.product.sku,
        demandedQuantity: line.quantity,
        allocatedQuantity: splitResult.allocatedQuantity,
        backorderQuantity: splitResult.backorderQuantity,
        allocations: splitResult.allocations,
      });

      for (const alloc of splitResult.allocations) {
        if (alloc.quantity <= 0) continue;

        if (!warehouseShipmentMap.has(alloc.warehouseId)) {
          const wh = warehouses.find((w) => w.id === alloc.warehouseId)!;
          warehouseShipmentMap.set(alloc.warehouseId, {
            warehouseId: wh.id,
            warehouseName: wh.name,
            shippingCostWeight: wh.shippingCostWeight ?? 1.0,
            lines: [],
            totalEstimatedCost: 0,
          });
        }

        const shipmentData = warehouseShipmentMap.get(alloc.warehouseId)!;
        shipmentData.lines.push({
          quotationLineId: line.id,
          productId: line.productId,
          variantId: line.variantId,
          productName: line.product.name,
          sku: line.product.sku,
          quantity: alloc.quantity,
        });
        shipmentData.totalEstimatedCost += alloc.shippingCostContribution;

        // Deduct from in-memory pool for consecutive lines
        productStock[alloc.warehouseId] = Math.max(
          0,
          (productStock[alloc.warehouseId] ?? 0) - alloc.quantity
        );
      }

      // Deficit Handling: Create backorder records for shortage
      if (splitResult.backorderQuantity > 0) {
        backorderRecords.push({
          quotationLineId: line.id,
          productId: line.productId,
          variantId: line.variantId,
          productName: line.product.name,
          sku: line.product.sku,
          quantityBackordered: splitResult.backorderQuantity,
        });
      }
    }

    // 3. Persist Shipments, ShipmentLines, and Stock Reservations
    let shipmentLetterCode = 65; // 'A'
    const createdShipments = [];

    for (const shipData of warehouseShipmentMap.values()) {
      const suffix = String.fromCharCode(shipmentLetterCode++);
      const shipmentNumber = `SHP-${year}-${parentFulfillmentOrder.fulfillmentNumber.replace("FUL-", "")}-${suffix}`;

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber,
          fulfillmentOrderId: parentFulfillmentOrder.id,
          warehouseId: shipData.warehouseId,
          shippingCost: Math.round(shipData.totalEstimatedCost * 100) / 100,
          status: ShipmentStatus.PENDING,
        },
      });

      for (const line of shipData.lines) {
        await tx.shipmentLine.create({
          data: {
            shipmentId: shipment.id,
            quotationLineId: line.quotationLineId,
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          },
        });

        // Reserve stock in the originating warehouse
        await adjustStock({
          organizationId: orgId,
          warehouseId: shipData.warehouseId,
          productId: line.productId,
          variantId: line.variantId ?? undefined,
          reservedDelta: line.quantity,
          movementType: StockMovementType.ORDER_RESERVED,
          referenceId: shipment.shipmentNumber,
          notes: `Stock reserved for shipment ${shipment.shipmentNumber}`,
          tx,
        });
      }

      createdShipments.push(shipment);
    }

    // 4. Persist Backorder Records for any remaining deficit
    const createdBackorders = [];
    for (const bo of backorderRecords) {
      const backorder = await tx.backorder.create({
        data: {
          fulfillmentOrderId: parentFulfillmentOrder.id,
          quotationLineId: bo.quotationLineId,
          productId: bo.productId,
          variantId: bo.variantId,
          quantityBackordered: bo.quantityBackordered,
          status: BackorderStatus.PENDING_REPLENISHMENT,
          notes: `Deficit remainder for ${bo.productName} (SKU: ${bo.sku})`,
        },
      });
      createdBackorders.push(backorder);
    }

    // 5. Update FulfillmentOrder status
    const finalStatus =
      createdBackorders.length > 0
        ? FulfillmentStatus.PARTIALLY_FULFILLED
        : FulfillmentStatus.PENDING;

    const updatedFulfillmentOrder = await tx.fulfillmentOrder.update({
      where: { id: parentFulfillmentOrder.id },
      data: { status: finalStatus },
      include: {
        shipments: {
          include: {
            warehouse: true,
            lines: { include: { product: true } },
          },
        },
        backorders: {
          include: { product: true },
        },
      },
    });

    return {
      message: "Waterfall allocation completed successfully.",
      fulfillmentOrder: updatedFulfillmentOrder,
      allocationsSummary: lineAllocationSummary,
      shipmentsCount: createdShipments.length,
      backordersCount: createdBackorders.length,
    };
  });
}

// =============================================================================
// Phase 2: Supply Chain Edge Cases & Overrides
// =============================================================================

export interface ManualOverrideInput {
  shipmentLineId: string;
  targetWarehouseId?: string;
  requestedQuantity: number;
  notes?: string;
}

/**
 * Phase 2: Manual ShipmentLine Override.
 *
 * Allows Finance or Operations to manually reassign a shipment line to a different warehouse
 * or adjust its allocated quantity.
 *
 * Strict Validation:
 * Validates that available unreserved stock in target warehouse satisfies:
 * quantityOnHand - quantityReserved >= requestedQuantity
 * Returns 400 Bad Request if stock is insufficient.
 */
export async function manualOverrideShipmentLine(orgId: string, input: ManualOverrideInput) {
  const { shipmentLineId, targetWarehouseId, requestedQuantity, notes } = input;

  if (requestedQuantity <= 0) {
    throw new AppError(400, "INVALID_QUANTITY", "Requested quantity must be greater than 0.");
  }

  // 1. Fetch current ShipmentLine with shipment & warehouse
  const shipmentLine = await prisma.shipmentLine.findFirst({
    where: { id: shipmentLineId },
    include: {
      shipment: {
        include: {
          fulfillmentOrder: true,
          warehouse: true,
        },
      },
      product: true,
      quotationLine: true,
    },
  });

  if (!shipmentLine || shipmentLine.shipment.fulfillmentOrder.organizationId !== orgId) {
    throw new AppError(404, "NOT_FOUND", "Shipment line not found.");
  }

  if (
    shipmentLine.shipment.status === ShipmentStatus.SHIPPED ||
    shipmentLine.shipment.status === ShipmentStatus.DELIVERED
  ) {
    throw new AppError(
      400,
      "INVALID_SHIPMENT_STATUS",
      `Cannot override line on a shipment that is already ${shipmentLine.shipment.status}.`
    );
  }

  const currentWarehouseId = shipmentLine.shipment.warehouseId;
  const effectiveTargetWarehouseId = targetWarehouseId || currentWarehouseId;
  const isWarehouseChanged = effectiveTargetWarehouseId !== currentWarehouseId;

  // 2. Fetch target warehouse and verify it belongs to organization
  const targetWarehouse = await prisma.warehouse.findFirst({
    where: { id: effectiveTargetWarehouseId, organizationId: orgId, isActive: true },
  });

  if (!targetWarehouse) {
    throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Target warehouse not found or is inactive.");
  }

  // 3. Strict Stock Level Validation
  const targetStockLevel = await prisma.stockLevel.findFirst({
    where: {
      warehouseId: effectiveTargetWarehouseId,
      productId: shipmentLine.productId,
      variantId: shipmentLine.variantId || null,
    },
  });

  const quantityOnHand = targetStockLevel?.quantityOnHand ?? 0;
  const quantityReserved = targetStockLevel?.quantityReserved ?? 0;

  // If same warehouse, account for the quantity already held by this line
  const effectiveAvailable = isWarehouseChanged
    ? quantityOnHand - quantityReserved
    : quantityOnHand - quantityReserved + shipmentLine.quantity;

  if (effectiveAvailable < requestedQuantity) {
    throw new AppError(
      400,
      "INSUFFICIENT_STOCK",
      `Stock validation failed for warehouse "${targetWarehouse.name}": Available unreserved quantity is ${effectiveAvailable} (${quantityOnHand} on hand, ${quantityReserved} reserved), but ${requestedQuantity} was requested.`
    );
  }

  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    // 4. Release old reservation
    await adjustStock({
      organizationId: orgId,
      warehouseId: currentWarehouseId,
      productId: shipmentLine.productId,
      variantId: shipmentLine.variantId ?? undefined,
      reservedDelta: -shipmentLine.quantity,
      movementType: StockMovementType.ADJUSTMENT,
      referenceId: shipmentLine.shipment.shipmentNumber,
      notes: `Manual override release: ${notes || "Reallocating shipment line"}`,
      tx,
    });

    // 5. Apply new reservation on target warehouse
    await adjustStock({
      organizationId: orgId,
      warehouseId: effectiveTargetWarehouseId,
      productId: shipmentLine.productId,
      variantId: shipmentLine.variantId ?? undefined,
      reservedDelta: requestedQuantity,
      movementType: StockMovementType.ORDER_RESERVED,
      referenceId: shipmentLine.shipment.shipmentNumber,
      notes: `Manual override allocation: ${notes || "Assigned via manual override"}`,
      tx,
    });

    let targetShipmentId = shipmentLine.shipmentId;

    // 6. If warehouse changed, move line to target warehouse shipment
    if (isWarehouseChanged) {
      let targetShipment = await tx.shipment.findFirst({
        where: {
          fulfillmentOrderId: shipmentLine.shipment.fulfillmentOrderId,
          warehouseId: effectiveTargetWarehouseId,
          status: ShipmentStatus.PENDING,
        },
      });

      if (!targetShipment) {
        const shipmentCount = await tx.shipment.count({
          where: { fulfillmentOrderId: shipmentLine.shipment.fulfillmentOrderId },
        });
        const suffix = String.fromCharCode(65 + shipmentCount);
        const shipmentNumber = `SHP-${year}-${shipmentLine.shipment.fulfillmentOrder.fulfillmentNumber.replace("FUL-", "")}-${suffix}`;

        targetShipment = await tx.shipment.create({
          data: {
            shipmentNumber,
            fulfillmentOrderId: shipmentLine.shipment.fulfillmentOrderId,
            warehouseId: effectiveTargetWarehouseId,
            shippingCost: targetWarehouse.shippingCostWeight * requestedQuantity,
            status: ShipmentStatus.PENDING,
          },
        });
      }

      targetShipmentId = targetShipment.id;
    }

    // 7. Update ShipmentLine
    const updatedLine = await tx.shipmentLine.update({
      where: { id: shipmentLineId },
      data: {
        shipmentId: targetShipmentId,
        quantity: requestedQuantity,
      },
      include: {
        shipment: {
          include: {
            warehouse: true,
            lines: { include: { product: true } },
          },
        },
        product: true,
      },
    });

    // Clean up empty source shipment if all lines were moved
    if (isWarehouseChanged) {
      const remainingLines = await tx.shipmentLine.count({
        where: { shipmentId: shipmentLine.shipmentId },
      });
      if (remainingLines === 0) {
        await tx.shipment.delete({ where: { id: shipmentLine.shipmentId } });
      }
    }

    return {
      message: "Shipment line overridden successfully.",
      line: updatedLine,
      validation: {
        warehouse: targetWarehouse.name,
        requestedQuantity,
        previousQuantity: shipmentLine.quantity,
        remainingAvailableStock: effectiveAvailable - requestedQuantity,
      },
    };
  });
}

// =============================================================================
// Phase 2: Mid-Fulfillment Restock Webhook & Backorder Consolidate Prompt
// =============================================================================

export interface RestockWebhookInput {
  warehouseId: string;
  productId: string;
  variantId?: string;
  quantityReceived: number;
  referenceNumber?: string;
  notes?: string;
}

/**
 * Phase 2: Inventory Restock Webhook.
 *
 * Records new stock received in StockMovement and updates StockLevel.quantityOnHand.
 * Queries active Backorder records for that productId.
 * If stock is now available, returns a consolidation payload designed to trigger
 * a "Consolidate Remaining Backorder" prompt automatically on the frontend.
 */
export async function processRestockWebhook(orgId: string, input: RestockWebhookInput) {
  const { warehouseId, productId, variantId, quantityReceived, referenceNumber, notes } = input;

  if (quantityReceived <= 0) {
    throw new AppError(400, "INVALID_QUANTITY", "Received restock quantity must be greater than 0.");
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, organizationId: orgId },
  });

  if (!warehouse) {
    throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Warehouse not found.");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
  });

  if (!product) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Record physical stock receipt in ledger & stock level
    const adjustedResult = await adjustStock({
      organizationId: orgId,
      warehouseId,
      productId,
      variantId,
      quantityDelta: quantityReceived,
      movementType: StockMovementType.PURCHASE_RECEIPT,
      referenceId: referenceNumber || `RESTOCK-${Date.now()}`,
      notes: notes || `Restock shipment receipt of ${quantityReceived} units for ${product.name}`,
      tx,
    });
    const updatedStockLevel = adjustedResult.stockLevel;

    // 2. Query all active backorders for this product across the tenant (FIFO by creation date)
    const activeBackorders = await tx.backorder.findMany({
      where: {
        productId,
        ...(variantId && { variantId }),
        status: BackorderStatus.PENDING_REPLENISHMENT,
        fulfillmentOrder: { organizationId: orgId },
      },
      include: {
        fulfillmentOrder: {
          include: { quotation: { include: { customer: true } } },
        },
        product: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const unreservedAvailable = Math.max(
      0,
      updatedStockLevel.quantityOnHand - updatedStockLevel.quantityReserved
    );

    // 3. Compute recommended consolidation allocations
    let remainingPool = unreservedAvailable;
    const recommendedConsolidations = [];

    for (const bo of activeBackorders) {
      if (remainingPool <= 0) break;
      const allocatable = Math.min(remainingPool, bo.quantityBackordered);
      if (allocatable > 0) {
        recommendedConsolidations.push({
          backorderId: bo.id,
          fulfillmentOrderId: bo.fulfillmentOrderId,
          fulfillmentNumber: bo.fulfillmentOrder.fulfillmentNumber,
          quoteNumber: bo.fulfillmentOrder.quotation.quoteNumber,
          customerName: bo.fulfillmentOrder.quotation.customer.name,
          quantityBackordered: bo.quantityBackordered,
          quantityEligibleToFulfill: allocatable,
          fullySatisfied: allocatable === bo.quantityBackordered,
        });
        remainingPool -= allocatable;
      }
    }

    const canConsolidate = recommendedConsolidations.length > 0;

    return {
      message: `Restock of ${quantityReceived} units for "${product.name}" recorded successfully.`,
      restock: {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantityReceived,
        newQuantityOnHand: updatedStockLevel.quantityOnHand,
        newQuantityReserved: updatedStockLevel.quantityReserved,
        availableUnreservedStock: unreservedAvailable,
      },
      // Frontend Prompt / Webhook Dispatch Payload
      consolidationTrigger: {
        canConsolidate,
        activeBackordersCount: activeBackorders.length,
        eligibleBackordersCount: recommendedConsolidations.length,
        promptMessage: canConsolidate
          ? `Inventory restocked for ${product.name}. ${recommendedConsolidations.length} active backorder(s) are eligible for immediate consolidation.`
          : `Inventory restocked for ${product.name}. No backorders currently waiting.`,
        recommendedConsolidations,
      },
    };
  });
}

// =============================================================================
// Fulfillment Order Listing & Detail Querying
// =============================================================================

export async function createFulfillmentOrder(
  orgId: string,
  quotationId: string,
  input?: CreateFulfillmentOrderInput
) {
  return autoSplitFulfillment(orgId, {
    quotationId,
    notes: input?.notes,
  });
}

export async function acceptSplit(orgId: string, fulfillmentOrderId: string) {
  return autoSplitFulfillment(orgId, { fulfillmentOrderId });
}

export async function listFulfillmentOrders(
  orgId: string,
  query?: { status?: FulfillmentStatus; quotationId?: string }
) {
  return prisma.fulfillmentOrder.findMany({
    where: {
      organizationId: orgId,
      ...(query?.status && { status: query.status }),
      ...(query?.quotationId && { quotationId: query.quotationId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      quotation: {
        select: { id: true, quoteNumber: true, title: true, stage: true },
      },
      shipments: {
        include: {
          warehouse: true,
          lines: { include: { product: true } },
        },
      },
      backorders: {
        include: { product: true },
      },
    },
  });
}

export async function getFulfillmentOrderById(orgId: string, id: string) {
  let order = await prisma.fulfillmentOrder.findFirst({
    where: {
      OR: [{ id }, { quotationId: id }],
      organizationId: orgId,
    },
    include: {
      quotation: {
        include: {
          customer: true,
          lines: { include: { product: true, variant: true } },
        },
      },
      shipments: {
        include: {
          warehouse: true,
          lines: { include: { product: true } },
        },
      },
      backorders: {
        include: { product: true },
      },
    },
  });

  if (!order) {
    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    if (!quotation) {
      throw new AppError(404, "NOT_FOUND", "Fulfillment order or quotation not found.");
    }

    return {
      id: `pending-${quotation.id}`,
      fulfillmentNumber: `FUL-PENDING-${quotation.quoteNumber}`,
      quotationId: quotation.id,
      organizationId: orgId,
      status: FulfillmentStatus.PENDING,
      shippingAddress: quotation.customer?.shippingAddress || quotation.customer?.billingAddress || "Default Delivery Address",
      notes: "Pending initial warehouse auto-split allocation",
      quotation,
      shipments: [],
      backorders: [],
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    };
  }

  return order;
}

// =============================================================================
// Split Preview Engine
// =============================================================================

export async function previewSplit(orgId: string, fulfillmentOrderId: string) {
  const fulfillmentOrder = await getFulfillmentOrderById(orgId, fulfillmentOrderId);

  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { shippingCostWeight: "asc" },
  });

  const warehouseCandidates: WarehouseCandidate[] = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    shippingCostWeight: w.shippingCostWeight ?? 1.0,
  }));

  const hardwareLines = fulfillmentOrder.quotation.lines.filter(
    (l) => l.itemType === CategoryType.HARDWARE
  );

  const productIds = hardwareLines.map((l) => l.productId);
  const stockLevels = await prisma.stockLevel.findMany({
    where: {
      warehouseId: { in: warehouses.map((w) => w.id) },
      productId: { in: productIds },
    },
  });

  const stockByProductAndWarehouse = new Map<string, Record<string, number>>();
  for (const sl of stockLevels) {
    if (!stockByProductAndWarehouse.has(sl.productId)) {
      stockByProductAndWarehouse.set(sl.productId, {});
    }
    const available = Math.max(0, sl.quantityOnHand - sl.quantityReserved);
    stockByProductAndWarehouse.get(sl.productId)![sl.warehouseId] = available;
  }

  const warehouseShipmentMap = new Map<
    string,
    {
      warehouseId: string;
      warehouseName: string;
      shippingCostWeight: number;
      lines: Array<{
        quotationLineId: string;
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
      }>;
      estimatedCost: number;
    }
  >();

  const backorderPreviews: Array<{
    quotationLineId: string;
    productId: string;
    productName: string;
    sku: string;
    quantityBackordered: number;
  }> = [];

  const lineResults = [];

  for (const line of hardwareLines) {
    const productStock = stockByProductAndWarehouse.get(line.productId) || {};
    const split = splitLine(line.quantity, warehouseCandidates, productStock);

    lineResults.push({
      quotationLineId: line.id,
      productId: line.productId,
      productName: line.product.name,
      sku: line.product.sku,
      requiredQuantity: split.requiredQuantity,
      allocatedQuantity: split.allocatedQuantity,
      backorderQuantity: split.backorderQuantity,
      allocations: split.allocations,
    });

    for (const alloc of split.allocations) {
      if (alloc.quantity <= 0) continue;

      if (!warehouseShipmentMap.has(alloc.warehouseId)) {
        const wh = warehouses.find((w) => w.id === alloc.warehouseId)!;
        warehouseShipmentMap.set(alloc.warehouseId, {
          warehouseId: wh.id,
          warehouseName: wh.name,
          shippingCostWeight: wh.shippingCostWeight ?? 1.0,
          lines: [],
          estimatedCost: 0,
        });
      }

      const shipmentPreview = warehouseShipmentMap.get(alloc.warehouseId)!;
      shipmentPreview.lines.push({
        quotationLineId: line.id,
        productId: line.productId,
        productName: line.product.name,
        sku: line.product.sku,
        quantity: alloc.quantity,
      });
      shipmentPreview.estimatedCost += alloc.shippingCostContribution;

      productStock[alloc.warehouseId] = Math.max(
        0,
        (productStock[alloc.warehouseId] ?? 0) - alloc.quantity
      );
    }

    if (split.backorderQuantity > 0) {
      backorderPreviews.push({
        quotationLineId: line.id,
        productId: line.productId,
        productName: line.product.name,
        sku: line.product.sku,
        quantityBackordered: split.backorderQuantity,
      });
    }
  }

  const shipmentPreviews = Array.from(warehouseShipmentMap.values());

  return {
    fulfillmentOrderId: fulfillmentOrder.id,
    fulfillmentNumber: fulfillmentOrder.fulfillmentNumber,
    status: fulfillmentOrder.status,
    estimatedShipmentCount: shipmentPreviews.length,
    shipments: shipmentPreviews,
    backorders: backorderPreviews,
    lineSplits: lineResults,
  };
}

// =============================================================================
// Shipment Status Progression & Physical Stock Deduction
// =============================================================================

export async function updateShipmentStatus(
  orgId: string,
  shipmentId: string,
  input: UpdateShipmentStatusInput
) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId },
    include: {
      fulfillmentOrder: {
        include: { quotation: true },
      },
      lines: { include: { product: true } },
      warehouse: true,
    },
  });

  if (!shipment || shipment.fulfillmentOrder.organizationId !== orgId) {
    throw new AppError(404, "NOT_FOUND", "Shipment not found.");
  }

  const previousStatus = shipment.status;
  const nextStatus = input.status;

  return prisma.$transaction(async (tx) => {
    // When transitioning to SHIPPED for the first time:
    // Actually deduct physical quantityOnHand and clear quantityReserved
    if (nextStatus === ShipmentStatus.SHIPPED && previousStatus !== ShipmentStatus.SHIPPED) {
      for (const line of shipment.lines) {
        await adjustStock({
          organizationId: orgId,
          warehouseId: shipment.warehouseId,
          productId: line.productId,
          quantityDelta: -line.quantity, // Physical inventory deduction
          reservedDelta: -line.quantity, // Clear reserved hold
          movementType: StockMovementType.ORDER_FULFILLED,
          referenceId: shipment.shipmentNumber,
          notes: `Dispatched shipment ${shipment.shipmentNumber}`,
          tx,
        });
      }
    }

    const updatedShipment = await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: nextStatus,
        ...(input.carrier && { carrier: input.carrier }),
        ...(input.trackingNumber && { trackingNumber: input.trackingNumber }),
        ...(nextStatus === ShipmentStatus.SHIPPED && !shipment.shippedAt && {
          shippedAt: new Date(),
        }),
        ...(nextStatus === ShipmentStatus.DELIVERED && !shipment.deliveredAt && {
          deliveredAt: new Date(),
        }),
      },
      include: {
        warehouse: true,
        lines: { include: { product: true } },
      },
    });

    // Evaluate if overall fulfillment order is now completely FULFILLED
    const allShipments = await tx.shipment.findMany({
      where: { fulfillmentOrderId: shipment.fulfillmentOrderId },
    });
    const openBackorders = await tx.backorder.count({
      where: {
        fulfillmentOrderId: shipment.fulfillmentOrderId,
        status: BackorderStatus.PENDING_REPLENISHMENT,
      },
    });

    const allDelivered = allShipments.every(
      (s) => s.status === ShipmentStatus.DELIVERED
    );

    if (allDelivered && openBackorders === 0) {
      await tx.fulfillmentOrder.update({
        where: { id: shipment.fulfillmentOrderId },
        data: { status: FulfillmentStatus.FULFILLED },
      });
    }

    return updatedShipment;
  });
}

// =============================================================================
// Backorder Consolidation Engine
// =============================================================================

export async function consolidateBackorder(orgId: string, backorderId: string) {
  const backorder = await prisma.backorder.findFirst({
    where: { id: backorderId },
    include: {
      fulfillmentOrder: { include: { quotation: true } },
      product: true,
    },
  });

  if (!backorder || backorder.fulfillmentOrder.organizationId !== orgId) {
    throw new AppError(404, "NOT_FOUND", "Backorder not found.");
  }

  if (backorder.status !== BackorderStatus.PENDING_REPLENISHMENT) {
    return {
      backorder,
      allocatedQuantity: 0,
      remainingBackorderQuantity: backorder.quantityBackordered,
      message: `Backorder is already in ${backorder.status} state.`,
    };
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { shippingCostWeight: "asc" },
  });

  const stockLevels = await prisma.stockLevel.findMany({
    where: {
      productId: backorder.productId,
      warehouseId: { in: warehouses.map((w) => w.id) },
    },
  });

  const stockMap: Record<string, number> = {};
  for (const sl of stockLevels) {
    stockMap[sl.warehouseId] = Math.max(0, sl.quantityOnHand - sl.quantityReserved);
  }

  const split = splitLine(backorder.quantityBackordered, warehouses, stockMap);

  if (split.allocatedQuantity === 0) {
    return {
      backorder,
      allocatedQuantity: 0,
      remainingBackorderQuantity: backorder.quantityBackordered,
      message: "Insufficient inventory to consolidate backorder.",
    };
  }

  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    let shipmentCounter = 1;

    for (const alloc of split.allocations) {
      if (alloc.quantity <= 0) continue;

      const shipmentNumber = `SHP-${year}-BO-${backorder.id.slice(-4)}-${shipmentCounter++}-${Math.floor(1000 + Math.random() * 9000)}`;

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber,
          fulfillmentOrderId: backorder.fulfillmentOrderId,
          warehouseId: alloc.warehouseId,
          shippingCost: alloc.shippingCostContribution,
          status: ShipmentStatus.PENDING,
        },
      });

      await tx.shipmentLine.create({
        data: {
          shipmentId: shipment.id,
          quotationLineId: backorder.quotationLineId,
          productId: backorder.productId,
          variantId: backorder.variantId,
          quantity: alloc.quantity,
        },
      });

      await adjustStock({
        organizationId: orgId,
        warehouseId: alloc.warehouseId,
        productId: backorder.productId,
        variantId: backorder.variantId ?? undefined,
        reservedDelta: alloc.quantity,
        movementType: StockMovementType.ORDER_RESERVED,
        referenceId: shipment.shipmentNumber,
        notes: `Consolidated backorder allocation for ${shipment.shipmentNumber}`,
        tx,
      });
    }

    let updatedBackorder;
    if (split.backorderQuantity === 0) {
      updatedBackorder = await tx.backorder.update({
        where: { id: backorder.id },
        data: {
          status: BackorderStatus.ALLOCATED,
          quantityBackordered: 0,
        },
      });
    } else {
      updatedBackorder = await tx.backorder.update({
        where: { id: backorder.id },
        data: {
          quantityBackordered: split.backorderQuantity,
        },
      });
    }

    return {
      backorder: updatedBackorder,
      allocatedQuantity: split.allocatedQuantity,
      remainingBackorderQuantity: split.backorderQuantity,
      allocations: split.allocations,
    };
  });
}
