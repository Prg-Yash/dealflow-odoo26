import { NextResponse } from "next/server";
import {
  prisma,
  ShipmentStatus,
  StockMovementType,
} from "@repo/db";

/**
 * Phase 2: POST /api/fulfillment/override
 * Manual ShipmentLine adjustment with strict stock validation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { shipmentLineId, targetWarehouseId, requestedQuantity, notes } = body;

    if (!shipmentLineId || typeof requestedQuantity !== "number" || requestedQuantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid shipmentLineId and requestedQuantity (> 0) are required." },
        { status: 400 }
      );
    }

    // 1. Fetch current ShipmentLine
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

    if (!shipmentLine) {
      return NextResponse.json(
        { success: false, error: "Shipment line not found." },
        { status: 404 }
      );
    }

    if (
      shipmentLine.shipment.status === ShipmentStatus.SHIPPED ||
      shipmentLine.shipment.status === ShipmentStatus.DELIVERED
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot override line on a shipment that is already ${shipmentLine.shipment.status}.`,
        },
        { status: 400 }
      );
    }

    const orgId = shipmentLine.shipment.fulfillmentOrder.organizationId;
    const currentWarehouseId = shipmentLine.shipment.warehouseId;
    const effectiveTargetWarehouseId = targetWarehouseId || currentWarehouseId;
    const isWarehouseChanged = effectiveTargetWarehouseId !== currentWarehouseId;

    // 2. Fetch target warehouse
    const targetWarehouse = await prisma.warehouse.findFirst({
      where: { id: effectiveTargetWarehouseId, organizationId: orgId, isActive: true },
    });

    if (!targetWarehouse) {
      return NextResponse.json(
        { success: false, error: "Target warehouse not found or is inactive." },
        { status: 404 }
      );
    }

    // 3. Strict Stock Level Validation: quantityOnHand - quantityReserved >= requestedQuantity
    const targetStock = await prisma.stockLevel.findFirst({
      where: {
        warehouseId: effectiveTargetWarehouseId,
        productId: shipmentLine.productId,
        variantId: shipmentLine.variantId || null,
      },
    });

    const quantityOnHand = targetStock?.quantityOnHand ?? 0;
    const quantityReserved = targetStock?.quantityReserved ?? 0;

    const availableUnreserved = isWarehouseChanged
      ? quantityOnHand - quantityReserved
      : (quantityOnHand - quantityReserved) + shipmentLine.quantity;

    if (availableUnreserved < requestedQuantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock in warehouse "${targetWarehouse.name}": Available unreserved is ${availableUnreserved} (${quantityOnHand} on hand, ${quantityReserved} reserved), but ${requestedQuantity} was requested.`,
          diagnostics: {
            warehouseId: targetWarehouse.id,
            warehouseName: targetWarehouse.name,
            productId: shipmentLine.productId,
            productName: shipmentLine.product.name,
            quantityOnHand,
            quantityReserved,
            availableUnreserved,
            requestedQuantity,
          },
        },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();

    // 4. Atomic Execution
    const result = await prisma.$transaction(async (tx) => {
      // Release reservation on old warehouse
      const oldStock = await tx.stockLevel.findFirst({
        where: {
          warehouseId: currentWarehouseId,
          productId: shipmentLine.productId,
          variantId: shipmentLine.variantId || null,
        },
      });

      if (oldStock) {
        await tx.stockLevel.update({
          where: { id: oldStock.id },
          data: { quantityReserved: Math.max(0, oldStock.quantityReserved - shipmentLine.quantity) },
        });
      }

      await tx.stockMovement.create({
        data: {
          warehouseId: currentWarehouseId,
          productId: shipmentLine.productId,
          variantId: shipmentLine.variantId || null,
          quantity: shipmentLine.quantity, // Released
          movementType: StockMovementType.ADJUSTMENT,
          referenceId: shipmentLine.shipment.shipmentNumber,
          notes: `Manual override adjustment: Released ${shipmentLine.quantity} units`,
        },
      });

      // Apply new reservation on target warehouse
      const newStock = await tx.stockLevel.findFirst({
        where: {
          warehouseId: effectiveTargetWarehouseId,
          productId: shipmentLine.productId,
          variantId: shipmentLine.variantId || null,
        },
      });

      if (newStock) {
        await tx.stockLevel.update({
          where: { id: newStock.id },
          data: { quantityReserved: newStock.quantityReserved + requestedQuantity },
        });
      }

      await tx.stockMovement.create({
        data: {
          warehouseId: effectiveTargetWarehouseId,
          productId: shipmentLine.productId,
          variantId: shipmentLine.variantId || null,
          quantity: -requestedQuantity, // Reserved
          movementType: StockMovementType.ORDER_RESERVED,
          referenceId: shipmentLine.shipment.shipmentNumber,
          notes: `Manual override allocation: Reserved ${requestedQuantity} units (${notes || "Manual adjustment"})`,
        },
      });

      let targetShipmentId = shipmentLine.shipmentId;

      // Move to target shipment if warehouse changed
      if (isWarehouseChanged) {
        let targetShipment = await tx.shipment.findFirst({
          where: {
            fulfillmentOrderId: shipmentLine.shipment.fulfillmentOrderId,
            warehouseId: effectiveTargetWarehouseId,
            status: ShipmentStatus.PENDING,
          },
        });

        if (!targetShipment) {
          const count = await tx.shipment.count({
            where: { fulfillmentOrderId: shipmentLine.shipment.fulfillmentOrderId },
          });
          const suffix = String.fromCharCode(65 + count);
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

      // Update shipment line
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

      // Clean up empty old shipment
      if (isWarehouseChanged) {
        const remaining = await tx.shipmentLine.count({
          where: { shipmentId: shipmentLine.shipmentId },
        });
        if (remaining === 0) {
          await tx.shipment.delete({ where: { id: shipmentLine.shipmentId } });
        }
      }

      return updatedLine;
    });

    return NextResponse.json({
      success: true,
      message: "Shipment line overridden successfully.",
      data: {
        line: result,
        validation: {
          targetWarehouse: targetWarehouse.name,
          requestedQuantity,
          previousQuantity: shipmentLine.quantity,
          remainingAvailable: availableUnreserved - requestedQuantity,
        },
      },
    });
  } catch (error: any) {
    console.error("Manual override error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process manual override." },
      { status: 500 }
    );
  }
}
