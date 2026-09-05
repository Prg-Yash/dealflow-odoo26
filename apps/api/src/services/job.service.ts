import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import { getBackorderQueue } from "../queues/backorder.queue.js";

// =============================================================================
// Background Job Status & Telemetry Service
// =============================================================================

export async function getJobStatus(jobId: string) {
  // 1. Check NeonDB persistent Job table
  const dbJob = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      logs: { orderBy: { createdAt: "asc" } },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (dbJob) {
    return {
      source: "DATABASE",
      job: dbJob,
    };
  }

  // 2. Fall back to BullMQ backorder queue
  try {
    const queue = getBackorderQueue();
    const bullmqJob = await queue.getJob(jobId);

    if (bullmqJob) {
      const state = await bullmqJob.getState();
      return {
        source: "BULLMQ",
        job: {
          id: bullmqJob.id,
          name: bullmqJob.name,
          queue: "backorder-consolidation-queue",
          data: bullmqJob.data,
          state,
          progress: bullmqJob.progress,
          attemptsMade: bullmqJob.attemptsMade,
          failedReason: bullmqJob.failedReason,
          returnvalue: bullmqJob.returnvalue,
          timestamp: new Date(bullmqJob.timestamp).toISOString(),
        },
      };
    }
  } catch {
    // Redis unavailable or queue query failed
  }

  throw new AppError(404, "NOT_FOUND", `Background job '${jobId}' not found.`);
}
