import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

export const BACKORDER_QUEUE_NAME = "backorder-consolidation-queue";

export interface BackorderConsolidationJobData {
  organizationId: string;
  productId: string;
  warehouseId?: string;
  triggeredAt?: string;
}

let backorderQueue: Queue<BackorderConsolidationJobData> | null = null;

export function getBackorderQueue(): Queue<BackorderConsolidationJobData> {
  if (!backorderQueue) {
    const connection = getRedisConnection();
    backorderQueue = new Queue<BackorderConsolidationJobData>(BACKORDER_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    backorderQueue.on("error", () => {
      // Suppress connection failure spam
    });
  }
  return backorderQueue;
}

/**
 * Enqueues a backorder consolidation job into BullMQ upon inventory replenishment.
 * Fails safely without throwing if Redis is unavailable.
 */
export async function enqueueBackorderConsolidation(
  organizationId: string,
  productId: string,
  warehouseId?: string
) {
  try {
    const queue = getBackorderQueue();
    await queue.add(
      "consolidate-backorders",
      {
        organizationId,
        productId,
        warehouseId,
        triggeredAt: new Date().toISOString(),
      },
      { jobId: `consolidate-${productId}-${Date.now()}` }
    );
  } catch {
    // Gracefully continue without interrupting HTTP request lifecycle
  }
}
