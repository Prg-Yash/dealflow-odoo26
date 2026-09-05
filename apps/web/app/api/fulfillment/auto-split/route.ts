import { NextResponse } from "next/server";
import {
  prisma,
  QuoteStage,
  CategoryType,
  StockMovementType,
  FulfillmentStatus,
  ShipmentStatus,
  BackorderStatus,
} from "@repo/db";

interface WarehouseScore {
  warehouseId: string;
  warehouseName: string | null;
  shippingCostWeight: number;
  availableStock: number;
  canFulfill100Percent: boolean;
}

/**
 * Pure multi-tier warehouse scoring utility.
 */
function scoreAndSortCandidates(
  demandedQty: number,
  warehouses: Array<{ id: string; name: string; shippingCostWeight: number }>,
  stockMap: Record<string, number>
): WarehouseScore[] {
  const evaluations: WarehouseScore[] = warehouses.map((wh) => {
    const availableStock = Math.max(0, stockMap[wh.id] ?? 0);
    const canFulfill100Percent = availableStock >= demandedQty;
    return {
      warehouseId: wh.id,
      warehouseName: wh.name,
      shippingCostWeight: wh.shippingCostWeight ?? 1.0,
      availableStock,
      canFulfill100Percent,
    };
  });

  evaluations.sort((a, b) => {
    // 1. Primary: 100% capacity check
    if (a.canFulfill100Percent !== b.canFulfill100Percent) {
      return a.canFulfill100Percent ? -1 : 1;
    }
    // 2. Secondary: Lowest shipping cost weight
    if (a.shippingCostWeight !== b.shippingCostWeight) {
      return a.shippingCostWeight - b.shippingCostWeight;
    }
    // 3. Tertiary: Highest available inventory capacity
    return b.availableStock - a.availableStock;
  });

  return evaluations;
}

/**
 * Phase 1: POST /api/fulfillment/auto-split
 * Waterfall Allocation Engine for physical hardware products.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { quotationId, fulfillmentOrderId, organizationId: explicitOrgId, notes } = body;

    if (!quotationId && !fulfillmentOrderId) {
      return NextResponse.json(
        { success: false, error: "Either quotationId or fulfillmentOrderId must be provided." },
        { status: 400 }
      );
    }

    // Retrieve Quotation with lines & customer
    let quotation = null;
    if (quotationId) {
      quotation = await prisma.quotation.findFirst({
        where: {
          OR: [{ id: quotationId }, { quoteNumber: quotationId }],
          ...(explicitOrgId && { organizationId: explicitOrgId }),
        },
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
        where: {
          OR: [{ id: fulfillmentOrderId }, { fulfillmentNumber: fulfillmentOrderId }],
          ...(explicitOrgId && { organizationId: explicitOrgId }),
        },
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
      if (fo) quotation = fo.quotation;
    }

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: "Quotation not found." },
        { status: 404 }
      );
    }

    const orgId = quotation.organizationId;

    if (
      quotation.stage !== QuoteStage.CONFIRMED &&
      quotation.stage !== QuoteStage.APPROVED
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Auto-split allocation can only be executed for CONFIRMED or APPROVED quotations (current stage: ${quotation.stage}).`,
        },
        { status: 400 }
      );
    }

    // Filter HARDWARE line items
    const hardwareLines = quotation.lines.filter(
      (l) => l.itemType === CategoryType.HARDWARE
    );

    if (hardwareLines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Quotation has no physical hardware lines requiring fulfillment." },
        { status: 400 }
      );
    }

    // Retrieve active warehouses
    const warehouses = await prisma.warehouse.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { shippingCostWeight: "asc" },
    });

    if (warehouses.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active warehouses found for this organization." },
        { status: 400 }
      );
    }

    const productIds = hardwareLines.map((l) => l.productId);
    const stockLevels = await prisma.stockLevel.findMany({
      where: {
        warehouseId: { in: warehouses.map((w) => w.id) },
        productId: { in: productIds },
      },
    });

    // Stock lookup: productId -> (warehouseId -> unreserved available)
    const stockByProductAndWarehouse = new Map<string, Record<string, number>>();
    for (const sl of stockLevels) {
      if (!stockByProductAndWarehouse.has(sl.productId)) {
        stockByProductAndWarehouse.set(sl.productId, {});
      }
      const available = Math.max(0, sl.quantityOnHand - sl.quantityReserved);
      stockByProductAndWarehouse.get(sl.productId)![sl.warehouseId] = available;
    }

    const year = new Date().getFullYear();

    // Execute atomic waterfall allocation transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get or create parent FulfillmentOrder
      let parentFulfillmentOrder = await tx.fulfillmentOrder.findFirst({
        where: { quotationId: quotation.id, organizationId: orgId },
        include: { shipments: true, backorders: true },
      });

      if (!parentFulfillmentOrder) {
        const count = await tx.fulfillmentOrder.count({ where: { organizationId: orgId } });
        let fulfillmentNumber = `FUL-${year}-${String(count + 1).padStart(4, "0")}`;
        const existingNum = await tx.fulfillmentOrder.findFirst({
          where: { fulfillmentNumber, organizationId: orgId },
        });
        if (existingNum) {
          fulfillmentNumber = `FUL-${year}-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

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
            notes: notes || `Auto-split allocation for quotation ${quotation.quoteNumber}`,
          },
          include: { shipments: true, backorders: true },
        });
      }

      // Warehouse shipment accumulator
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

      const backorderRecords = [];
      const lineAllocationSummary = [];

      // 2. Waterfall allocation per line
      for (const line of hardwareLines) {
        const productStock = stockByProductAndWarehouse.get(line.productId) || {};
        const sortedWarehouses = scoreAndSortCandidates(line.quantity, warehouses, productStock);

        let remaining = line.quantity;
        const allocations = [];

        for (const whEval of sortedWarehouses) {
          if (remaining <= 0) break;
          const available = Math.max(0, productStock[whEval.warehouseId] ?? 0);
          if (available <= 0) continue;

          const allocated = Math.min(remaining, available);
          allocations.push({
            warehouseId: whEval.warehouseId,
            warehouseName: whEval.warehouseName,
            quantity: allocated,
            shippingCostWeight: whEval.shippingCostWeight,
            shippingCostContribution: Math.round(allocated * whEval.shippingCostWeight * 100) / 100,
          });

          if (!warehouseShipmentMap.has(whEval.warehouseId)) {
            warehouseShipmentMap.set(whEval.warehouseId, {
              warehouseId: whEval.warehouseId,
              warehouseName: whEval.warehouseName || "Warehouse",
              shippingCostWeight: whEval.shippingCostWeight,
              lines: [],
              totalEstimatedCost: 0,
            });
          }

          const shipmentData = warehouseShipmentMap.get(whEval.warehouseId)!;
          shipmentData.lines.push({
            quotationLineId: line.id,
            productId: line.productId,
            variantId: line.variantId,
            productName: line.product.name,
            sku: line.product.sku,
            quantity: allocated,
          });
          shipmentData.totalEstimatedCost += Math.round(allocated * whEval.shippingCostWeight * 100) / 100;

          productStock[whEval.warehouseId] = Math.max(0, available - allocated);
          remaining -= allocated;
        }

        const allocatedQuantity = line.quantity - remaining;
        const backorderQuantity = remaining;

        lineAllocationSummary.push({
          quotationLineId: line.id,
          productId: line.productId,
          productName: line.product.name,
          sku: line.product.sku,
          demandedQuantity: line.quantity,
          allocatedQuantity,
          backorderQuantity,
          allocations,
        });

        // Shortage handling: Create backorder
        if (backorderQuantity > 0) {
          backorderRecords.push({
            quotationLineId: line.id,
            productId: line.productId,
            variantId: line.variantId,
            productName: line.product.name,
            sku: line.product.sku,
            quantityBackordered: backorderQuantity,
          });
        }
      }

      // 3. Persist Shipments & Reserve Stock
      let shipmentLetterCode = 65;
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

          // Reserve stock in warehouse
          const stock = await tx.stockLevel.findFirst({
            where: {
              warehouseId: shipData.warehouseId,
              productId: line.productId,
              variantId: line.variantId || null,
            },
          });

          if (stock) {
            await tx.stockLevel.update({
              where: { id: stock.id },
              data: { quantityReserved: stock.quantityReserved + line.quantity },
            });
          } else {
            await tx.stockLevel.create({
              data: {
                warehouseId: shipData.warehouseId,
                productId: line.productId,
                variantId: line.variantId || null,
                quantityOnHand: 0,
                quantityReserved: line.quantity,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              warehouseId: shipData.warehouseId,
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: -line.quantity,
              movementType: StockMovementType.ORDER_RESERVED,
              referenceId: shipment.shipmentNumber,
              notes: `Auto-split reservation for ${shipment.shipmentNumber}`,
            },
          });
        }

        createdShipments.push(shipment);
      }

      // 4. Persist Backorders
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
            notes: `Deficit remainder for ${bo.productName}`,
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
        fulfillmentOrder: updatedFulfillmentOrder,
        allocationsSummary: lineAllocationSummary,
        shipmentsCount: createdShipments.length,
        backordersCount: createdBackorders.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Waterfall allocation completed successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error("Auto-split error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute auto-split allocation." },
      { status: 500 }
    );
  }
}
