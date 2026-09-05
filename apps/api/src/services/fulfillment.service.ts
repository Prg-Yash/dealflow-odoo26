import {
  prisma,
  FulfillmentStatus,
  ShipmentStatus,
  BackorderStatus,
  StockMovementType,
  QuoteStage,
} from "@repo/db";
import { AppError } from "../middleware/error.js";
import { splitLine, type WarehouseCandidate } from "../lib/fulfillment-engine.js";
import { adjustStock } from "./warehouse.service.js";
import type {
  CreateFulfillmentOrderInput,
  UpdateShipmentStatusInput,
} from "../schemas/fulfillment.schema.js";

// =============================================================================
// Fulfillment Order Creation & Preview
// =============================================================================

export async function createFulfillmentOrder(
  orgId: string,
  quotationId: string,
  input?: CreateFulfillmentOrderInput
) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: {
      customer: true,
      lines: {
        include: { product: true },
      },
    },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  if (
    quotation.stage !== QuoteStage.APPROVED &&
    quotation.stage !== QuoteStage.CONFIRMED
  ) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      `Fulfillment orders can only be created for APPROVED or CONFIRMED quotations (current stage: ${quotation.stage}).`
    );
  }

  // Idempotency: return existing fulfillment order if already created
  const existing = await prisma.fulfillmentOrder.findFirst({
    where: { quotationId, organizationId: orgId },
    include: {
      shipments: { include: { lines: true } },
      backorders: true,
    },
  });
  if (existing) return existing;

  const count = await prisma.fulfillmentOrder.count();
  const year = new Date().getFullYear();
  let fulfillmentNumber = `FUL-${year}-${String(count + 1).padStart(4, "0")}`;
  const existingNum = await prisma.fulfillmentOrder.findFirst({
    where: { fulfillmentNumber, organizationId: orgId },
  });
  if (existingNum) {
    fulfillmentNumber = `FUL-${year}-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const shippingAddress =
    input?.shippingAddress || quotation.customer.shippingAddress || null;

  return prisma.fulfillmentOrder.create({
    data: {
      fulfillmentNumber,
      quotationId: quotation.id,
      organizationId: orgId,
      status: FulfillmentStatus.PENDING,
      shippingAddress,
      notes: input?.notes,
    },
    include: {
      quotation: {
        include: {
          lines: { include: { product: true } },
        },
      },
      shipments: true,
      backorders: true,
    },
  });
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
      shipments: true,
      backorders: true,
    },
  });
}

export async function getFulfillmentOrderById(orgId: string, id: string) {
  const order = await prisma.fulfillmentOrder.findFirst({
    where: { id, organizationId: orgId },
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
    throw new AppError(404, "NOT_FOUND", "Fulfillment order not found.");
  }
  return order;
}

// =============================================================================
// Greedy Split Preview Engine
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
    shippingCostWeight: w.shippingCostWeight,
  }));

  const productIds = fulfillmentOrder.quotation.lines.map((l) => l.productId);
  const stockLevels = await prisma.stockLevel.findMany({
    where: {
      warehouseId: { in: warehouses.map((w) => w.id) },
      productId: { in: productIds },
    },
  });

  // Map of warehouseId -> available quantity per product
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

  for (const line of fulfillmentOrder.quotation.lines) {
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
          shippingCostWeight: wh.shippingCostWeight,
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

      // Deduct from in-memory pool so subsequent lines evaluate remaining capacity
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
// Accept Split (Single Atomic Transaction with Stock Reservation)
// =============================================================================

export async function acceptSplit(orgId: string, fulfillmentOrderId: string) {
  const fulfillmentOrder = await getFulfillmentOrderById(orgId, fulfillmentOrderId);

  if (
    fulfillmentOrder.status === FulfillmentStatus.FULFILLED ||
    fulfillmentOrder.shipments.length > 0
  ) {
    throw new AppError(
      400,
      "ALREADY_ACCEPTED",
      "This fulfillment order has already been split and accepted."
    );
  }

  const preview = await previewSplit(orgId, fulfillmentOrderId);

  if (preview.shipments.length === 0 && preview.backorders.length === 0) {
    throw new AppError(400, "EMPTY_ORDER", "No items available to fulfill or backorder.");
  }

  const year = new Date().getFullYear();

  return prisma.$transaction(async (tx) => {
    let shipmentCounter = 1;

    // 1. Create Shipments and ShipmentLines + Reserve Stock
    for (const shipPreview of preview.shipments) {
      const shipmentNumber = `SHP-${year}-${fulfillmentOrder.fulfillmentNumber.replace("FUL-", "")}-${String.fromCharCode(64 + shipmentCounter++)}`;

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber,
          fulfillmentOrderId: fulfillmentOrder.id,
          warehouseId: shipPreview.warehouseId,
          shippingCost: shipPreview.estimatedCost,
          status: ShipmentStatus.PENDING,
        },
      });

      for (const line of shipPreview.lines) {
        await tx.shipmentLine.create({
          data: {
            shipmentId: shipment.id,
            quotationLineId: line.quotationLineId,
            productId: line.productId,
            quantity: line.quantity,
          },
        });

        // Reserve stock in the originating warehouse via adjustStock
        await adjustStock({
          organizationId: orgId,
          warehouseId: shipPreview.warehouseId,
          productId: line.productId,
          reservedDelta: line.quantity,
          movementType: StockMovementType.ORDER_RESERVED,
          referenceId: shipment.shipmentNumber,
          notes: `Reservation for shipment ${shipment.shipmentNumber}`,
          tx,
        });
      }
    }

    // 2. Create Backorder records for any shortage remainder
    for (const bo of preview.backorders) {
      await tx.backorder.create({
        data: {
          fulfillmentOrderId: fulfillmentOrder.id,
          quotationLineId: bo.quotationLineId,
          productId: bo.productId,
          quantityBackordered: bo.quantityBackordered,
          status: BackorderStatus.PENDING_REPLENISHMENT,
          notes: `Unfulfilled remainder for ${bo.productName}`,
        },
      });
    }

    // 3. Update overall FulfillmentOrder status
    const newStatus =
      preview.backorders.length > 0
        ? FulfillmentStatus.PARTIALLY_FULFILLED
        : FulfillmentStatus.PENDING;

    return tx.fulfillmentOrder.update({
      where: { id: fulfillmentOrder.id },
      data: { status: newStatus },
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
  });
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
      fulfillmentOrder: true,
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
          quantity: alloc.quantity,
        },
      });

      await adjustStock({
        organizationId: orgId,
        warehouseId: alloc.warehouseId,
        productId: backorder.productId,
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

/**
 * Consolidates all open backorders for a specific product across an organization.
 */
export async function consolidateProductBackorders(orgId: string, productId: string) {
  const pendingBackorders = await prisma.backorder.findMany({
    where: {
      productId,
      status: BackorderStatus.PENDING_REPLENISHMENT,
      fulfillmentOrder: { organizationId: orgId },
    },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const bo of pendingBackorders) {
    const res = await consolidateBackorder(orgId, bo.id);
    results.push(res);
  }

  return {
    productId,
    processedCount: pendingBackorders.length,
    results,
  };
}
