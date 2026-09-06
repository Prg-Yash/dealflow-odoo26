import { NextResponse } from "next/server";
import {
  prisma,
  StockMovementType,
  BackorderStatus,
} from "@repo/db";

/**
 * Phase 2: POST /api/inventory/restock
 * Mid-fulfillment inventory restock webhook & backorder consolidation prompt trigger.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { warehouseId, productId, variantId, quantityReceived, referenceNumber, notes, organizationId: explicitOrgId } = body;

    if (!warehouseId || !productId || typeof quantityReceived !== "number" || quantityReceived <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid warehouseId, productId, and quantityReceived (> 0) are required." },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, ...(explicitOrgId && { organizationId: explicitOrgId }) },
    });

    if (!warehouse) {
      return NextResponse.json(
        { success: false, error: "Warehouse not found." },
        { status: 404 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId: warehouse.organizationId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const orgId = warehouse.organizationId;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update or create stock level
      let stock = await tx.stockLevel.findFirst({
        where: {
          warehouseId,
          productId,
          variantId: variantId || null,
        },
      });

      if (stock) {
        stock = await tx.stockLevel.update({
          where: { id: stock.id },
          data: { quantityOnHand: stock.quantityOnHand + quantityReceived },
        });
      } else {
        stock = await tx.stockLevel.create({
          data: {
            warehouseId,
            productId,
            variantId: variantId || null,
            quantityOnHand: quantityReceived,
            quantityReserved: 0,
          },
        });
      }

      // 2. Record StockMovement
      await tx.stockMovement.create({
        data: {
          warehouseId,
          productId,
          variantId: variantId || null,
          quantity: quantityReceived,
          movementType: StockMovementType.PURCHASE_RECEIPT,
          referenceId: referenceNumber || `RESTOCK-${Date.now()}`,
          notes: notes || `Restock shipment receipt of ${quantityReceived} units for ${product.name}`,
        },
      });

      // 3. Query all pending backorders for this product (FIFO)
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

      const unreservedAvailable = Math.max(0, stock.quantityOnHand - stock.quantityReserved);

      // 4. Compute recommended consolidation allocations
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
        restock: {
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantityReceived,
          newQuantityOnHand: stock.quantityOnHand,
          newQuantityReserved: stock.quantityReserved,
          availableUnreservedStock: unreservedAvailable,
        },
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

    return NextResponse.json({
      success: true,
      message: `Restock of ${quantityReceived} units for "${product.name}" recorded successfully.`,
      data: result,
    });
  } catch (error: any) {
    console.error("Restock webhook error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process restock webhook." },
      { status: 500 }
    );
  }
}
