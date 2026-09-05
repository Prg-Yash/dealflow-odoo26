import { type Job as BullJob } from "bullmq";
import { prisma, JobStatus } from "@repo/db";
import { type DataSyncJobData } from "../queues/index.js";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

export async function processDataSyncJob(bullJob: BullJob<DataSyncJobData>): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  const { data } = bullJob;
  const targetEntity = data.targetEntity || "jobs";

  logger.info(`Starting data sync job #${bullJob.id} on target: ${targetEntity}`);

  try {
    // Perform database health aggregation query on NeonDB
    const [pendingCount, processingCount, completedCount, failedCount, userCount] = await Promise.all([
      prisma.job.count({ where: { status: JobStatus.PENDING } }),
      prisma.job.count({ where: { status: JobStatus.PROCESSING } }),
      prisma.job.count({ where: { status: JobStatus.COMPLETED } }),
      prisma.job.count({ where: { status: JobStatus.FAILED } }),
      prisma.user.count(),
    ]);

    const durationMs = Date.now() - startTime;
    const summary = {
      targetEntity,
      databaseMetrics: {
        totalUsers: userCount,
        jobs: {
          pending: pendingCount,
          processing: processingCount,
          completed: completedCount,
          failed: failedCount,
        },
      },
      durationMs,
      syncedAt: new Date().toISOString(),
      workerId: ENV.WORKER_ID,
    };

    logger.info(`Data sync job #${bullJob.id} completed in ${durationMs}ms`, summary);
    return summary;
  } catch (error) {
    logger.error(`Data sync job #${bullJob.id} failed:`, error);
    throw error;
  }
}
