import { prisma } from "@repo/db";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { heavyComputeQueue, dataSyncQueue } from "../queues/index.js";

let metricsTimer: NodeJS.Timeout | null = null;
let previousCpuUsage = process.cpuUsage();
let previousCpuTime = Date.now();

async function collectAndRecordMetrics(): Promise<void> {
  try {
    const mem = process.memoryUsage();
    const memoryUsageMb = Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100;

    // Calculate approximate CPU usage percentage
    const currentCpuTime = Date.now();
    const timeDeltaMs = (currentCpuTime - previousCpuTime) || 1;
    const currentCpuUsage = process.cpuUsage(previousCpuUsage);
    
    // Convert microseconds to milliseconds
    const totalCpuMs = (currentCpuUsage.user + currentCpuUsage.system) / 1000;
    const cpuUsagePercent = Math.min(
      100,
      Math.round((totalCpuMs / timeDeltaMs) * 100 * 100) / 100
    );

    previousCpuUsage = process.cpuUsage();
    previousCpuTime = currentCpuTime;

    // Get queue job counts safely
    let activeJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;

    try {
      const [heavyActive, heavyCompleted, heavyFailed] = await Promise.all([
        heavyComputeQueue.getActiveCount(),
        heavyComputeQueue.getCompletedCount(),
        heavyComputeQueue.getFailedCount(),
      ]);

      const [syncActive, syncCompleted, syncFailed] = await Promise.all([
        dataSyncQueue.getActiveCount(),
        dataSyncQueue.getCompletedCount(),
        dataSyncQueue.getFailedCount(),
      ]);

      activeJobs = heavyActive + syncActive;
      completedJobs = heavyCompleted + syncCompleted;
      failedJobs = heavyFailed + syncFailed;
    } catch {
      // If Redis counts fail momentarily, continue with 0
    }

    logger.debug(
      `Worker Health: Memory=${memoryUsageMb}MB, CPU=${cpuUsagePercent}%, Active=${activeJobs}, Completed=${completedJobs}, Failed=${failedJobs}`
    );

    // Save metric snapshot to NeonDB
    if (ENV.DATABASE_URL) {
      await prisma.computeMetric.create({
        data: {
          workerId: ENV.WORKER_ID,
          cpuUsage: cpuUsagePercent,
          memoryUsageMb,
          activeJobs,
          completedJobs,
          failedJobs,
        },
      });
    }
  } catch (error) {
    logger.warn(`Failed to collect or record compute metrics: ${(error as Error).message}`);
  }
}

export function startMetricsReporter(intervalMs = ENV.METRICS_INTERVAL_MS): void {
  if (metricsTimer) {
    clearInterval(metricsTimer);
  }

  logger.info(`Starting 24/7 background metrics reporter (interval: ${intervalMs}ms)`);
  // Record initial metric immediately
  void collectAndRecordMetrics();

  metricsTimer = setInterval(() => {
    void collectAndRecordMetrics();
  }, intervalMs);
}

export function stopMetricsReporter(): void {
  if (metricsTimer) {
    clearInterval(metricsTimer);
    metricsTimer = null;
    logger.info("Metrics reporter stopped");
  }
}
