import { prisma, JobStatus } from "@repo/db";
import { heavyComputeQueue, type HeavyComputeJobData } from "../queues/index.js";
import { logger } from "../utils/logger.js";

let pollerTimer: NodeJS.Timeout | null = null;
let isPolling = false;

/**
 * Polls NeonDB for PENDING compute jobs created by the API server
 * and feeds them into the BullMQ Redis queue for distributed worker execution.
 */
export async function pollAndEnqueuePendingJobs(): Promise<void> {
  if (isPolling) {
    return;
  }
  isPolling = true;

  try {
    const pendingJobs = await prisma.job.findMany({
      where: { status: JobStatus.PENDING },
      take: 10,
      orderBy: { createdAt: "asc" },
    });

    for (const job of pendingJobs) {
      const payload = (job.payload as Record<string, unknown>) || {};
      const matrixSize = typeof payload.matrixSize === "number" ? payload.matrixSize : 128;
      const iterations = typeof payload.iterations === "number" ? payload.iterations : 25;

      logger.info(`[JobPoller] Detected PENDING job #${job.id} in NeonDB -> Enqueueing into BullMQ...`);

      // Add to BullMQ with jobId matching DB ID to guarantee deduplication
      await heavyComputeQueue.add(
        job.name || "heavy-compute",
        {
          jobId: job.id,
          taskType: (job.type as HeavyComputeJobData["taskType"]) || "matrix-multiplication",
          matrixSize,
          iterations,
          userId: job.userId ?? undefined,
        },
        {
          jobId: job.id,
        }
      );

      // Transition to PROCESSING in NeonDB so subsequent polling cycles don't re-enqueue
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.PROCESSING,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    logger.debug(`[JobPoller] Polling cycle error: ${(error as Error).message}`);
  } finally {
    isPolling = false;
  }
}

/**
 * Starts periodic polling of NeonDB for new pending compute tasks
 */
export function startJobPoller(intervalMs: number = 3000): void {
  if (pollerTimer) {
    return;
  }
  logger.info(`Starting NeonDB-to-Queue Job Poller (polling every ${intervalMs}ms)`);
  void pollAndEnqueuePendingJobs();
  pollerTimer = setInterval(() => {
    void pollAndEnqueuePendingJobs();
  }, intervalMs);
}

/**
 * Gracefully stops the job poller
 */
export function stopJobPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    logger.info("Stopped NeonDB Job Poller");
  }
}
