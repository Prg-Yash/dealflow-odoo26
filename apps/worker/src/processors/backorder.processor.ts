import { type Job as BullJob } from "bullmq";
import { prisma, ShipmentStatus, BackorderStatus, StockMovementType } from "@repo/db";
import { type BackorderConsolidationJobData } from "../queues/index.js";
import { logger } from "../utils/logger.js";

/**
 * Worker processor that automatically consolidates pending backorders
 * when a stock replenishment event is detected for a product.
 */
export async function processBackorderConsolidationJob(
  job: BullJob<BackorderConsolidationJobData>
): Promise<Record<string, unknown>> {
  const { organizationId, productId } = job.data;
  logger.info(
    `[BackorderWorker] Consolidating open backorders for product ${productId} in org ${organizationId}`
  );

  const pendingBackorders = await prisma.backorder.findMany({
    where: {
      productId,
      status: BackorderStatus.PENDING_REPLENISHMENT,
      fulfillmentOrder: { organizationId },
    },
    orderBy: { createdAt: "asc" },
  });

  if (pendingBackorders.length === 0) {
    logger.info(`[BackorderWorker] No pending backorders found for product ${productId}`);
    return { consolidatedCount: 0 };
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId, isActive: true },
    orderBy: { shippingCostWeight: "asc" },
  });

  let allocationsCount = 0;
  const year = new Date().getFullYear();

  for (const bo of pendingBackorders) {
    const stockLevels = await prisma.stockLevel.findMany({
      where: {
        productId,
        warehouseId: { in: warehouses.map((w) => w.id) },
      },
    });

    let remainingNeeded = bo.quantityBackordered;

    for (const wh of warehouses) {
      if (remainingNeeded <= 0) break;
      const sl = stockLevels.find((s) => s.warehouseId === wh.id);
      const available = Math.max(0, (sl?.quantityOnHand ?? 0) - (sl?.quantityReserved ?? 0));
      if (available <= 0) continue;

      const alloc = Math.min(remainingNeeded, available);

      await prisma.$transaction(async (tx) => {
        const shipmentNumber = `SHP-${year}-BO-${bo.id.slice(-4)}-${Date.now().toString().slice(-4)}`;
        const shipment = await tx.shipment.create({
          data: {
            shipmentNumber,
            fulfillmentOrderId: bo.fulfillmentOrderId,
            warehouseId: wh.id,
            shippingCost: alloc * wh.shippingCostWeight,
            status: ShipmentStatus.PENDING,
          },
        });

        await tx.shipmentLine.create({
          data: {
            shipmentId: shipment.id,
            quotationLineId: bo.quotationLineId,
            productId: bo.productId,
            quantity: alloc,
          },
        });

        if (sl) {
          await tx.stockLevel.update({
            where: { id: sl.id },
            data: { quantityReserved: { increment: alloc } },
          });
        }

        await tx.stockMovement.create({
          data: {
            warehouseId: wh.id,
            productId,
            quantity: alloc,
            movementType: StockMovementType.ORDER_RESERVED,
            referenceId: shipmentNumber,
            notes: `Worker consolidated backorder for shipment ${shipmentNumber}`,
          },
        });

        if (alloc === remainingNeeded) {
          await tx.backorder.update({
            where: { id: bo.id },
            data: { status: BackorderStatus.ALLOCATED, quantityBackordered: 0 },
          });
        } else {
          await tx.backorder.update({
            where: { id: bo.id },
            data: { quantityBackordered: { decrement: alloc } },
          });
        }
      });

      remainingNeeded -= alloc;
      allocationsCount++;
    }
  }

  logger.info(`[BackorderWorker] Consolidations complete: ${allocationsCount} allocations processed`);
  return { consolidatedCount: allocationsCount, productBackordersCount: pendingBackorders.length };
}
