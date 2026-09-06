import { Worker, type Job as BullJob } from "bullmq";
import { prisma } from "@repo/db";
import { ENV } from "./config/env.js";
import { redisConnection } from "./config/redis.js";
import {
  QUEUE_NAMES,
  type HeavyComputeJobData,
  type DataSyncJobData,
  type BackorderConsolidationJobData,
  type SubscriptionReminderJobData,
} from "./queues/index.js";
import { processHeavyComputeJob } from "./processors/heavy-compute.processor.js";
import { processDataSyncJob } from "./processors/data-sync.processor.js";
import { processBackorderConsolidationJob } from "./processors/backorder.processor.js";
import { processSubscriptionReminderJob } from "./processors/subscription-reminder.processor.js";
import { startMetricsReporter, stopMetricsReporter } from "./services/metrics.service.js";
import { startJobPoller, stopJobPoller } from "./services/job-poller.service.js";
import { logger } from "./utils/logger.js";

logger.info("==================================================");
logger.info(`  Dealflow 360 24/7 Background Compute Worker`);
logger.info(`  Worker ID   : ${ENV.WORKER_ID}`);
logger.info(`  Environment : ${ENV.NODE_ENV}`);
logger.info(`  Concurrency : ${ENV.WORKER_CONCURRENCY}`);
logger.info("==================================================");

// Initialize BullMQ Worker for Heavy Compute Queue
const heavyComputeWorker = new Worker<HeavyComputeJobData>(
  QUEUE_NAMES.HEAVY_COMPUTE,
  async (job: BullJob<HeavyComputeJobData>) => {
    return await processHeavyComputeJob(job);
  },
  {
    connection: redisConnection,
    concurrency: ENV.WORKER_CONCURRENCY,
    lockDuration: 60000, // 60s lock duration for heavy tasks
    stalledInterval: 30000,
  }
);

// Initialize BullMQ Worker for Data Sync Queue
const dataSyncWorker = new Worker<DataSyncJobData>(
  QUEUE_NAMES.DATA_SYNC,
  async (job: BullJob<DataSyncJobData>) => {
    return await processDataSyncJob(job);
  },
  {
    connection: redisConnection,
    concurrency: 2,
    lockDuration: 30000,
  }
);

// Initialize BullMQ Worker for Backorder Consolidation Queue
const backorderWorker = new Worker<BackorderConsolidationJobData>(
  QUEUE_NAMES.BACKORDER_CONSOLIDATION,
  async (job: BullJob<BackorderConsolidationJobData>) => {
    return await processBackorderConsolidationJob(job);
  },
  {
    connection: redisConnection,
    concurrency: 2,
    lockDuration: 30000,
  }
);

// Initialize BullMQ Worker for Subscription Reminder Queue
const subscriptionReminderWorker = new Worker<SubscriptionReminderJobData>(
  QUEUE_NAMES.SUBSCRIPTION_REMINDER,
  async (job: BullJob<SubscriptionReminderJobData>) => {
    return await processSubscriptionReminderJob(job);
  },
  {
    connection: redisConnection,
    concurrency: 2,
    lockDuration: 30000,
  }
);

// Worker Event Listeners: Heavy Compute
heavyComputeWorker.on("active", (job) => {
  logger.info(`[HeavyCompute] Job #${job.id} is now ACTIVE on queue '${job.queueName}'`);
});

heavyComputeWorker.on("progress", (job, progress) => {
  logger.info(`[HeavyCompute] Job #${job.id} progress: ${progress}%`);
});

heavyComputeWorker.on("completed", (job, returnvalue) => {
  logger.info(`[HeavyCompute] Job #${job.id} COMPLETED`, {
    jobId: job.id,
    durationMs: returnvalue?.durationMs,
  });
});

heavyComputeWorker.on("failed", (job, err) => {
  logger.error(`[HeavyCompute] Job #${job?.id} FAILED: ${err.message}`, {
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    stack: err.stack,
  });
});

heavyComputeWorker.on("stalled", (jobId) => {
  logger.warn(`[HeavyCompute] Job #${jobId} STALLED and will be reprocessed`);
});

heavyComputeWorker.on("error", (err) => {
  logger.error("[HeavyCompute] Worker encountered an unhandled error:", err);
});

// Worker Event Listeners: Data Sync
dataSyncWorker.on("completed", (job) => {
  logger.info(`[DataSync] Job #${job.id} COMPLETED`);
});

dataSyncWorker.on("failed", (job, err) => {
  logger.error(`[DataSync] Job #${job?.id} FAILED: ${err.message}`);
});

dataSyncWorker.on("error", (err) => {
  logger.error("[DataSync] Worker encountered an unhandled error:", err);
});

// Worker Event Listeners: Subscription Reminder
subscriptionReminderWorker.on("completed", (job, returnvalue) => {
  logger.info(
    `[SubscriptionReminder] Job #${job.id} COMPLETED for ${returnvalue?.customerEmail || "subscriber"} | Plan: "${returnvalue?.planName || "N/A"}" | ₹${(returnvalue?.amount || 0).toLocaleString()} | SMTP Status: ${returnvalue?.emailDelivered ? "Delivered (" + returnvalue.messageId + ")" : "Logged Fallback"}`
  );
});

subscriptionReminderWorker.on("failed", (job, err) => {
  logger.error(`[SubscriptionReminder] Job #${job?.id} FAILED: ${err.message}`);
});

subscriptionReminderWorker.on("error", (err) => {
  logger.error("[SubscriptionReminder] Worker error:", err);
});

// Start periodic metrics collection and database reporting
startMetricsReporter(ENV.METRICS_INTERVAL_MS);

// Start polling NeonDB for new pending compute tasks
startJobPoller(3000);

// Graceful Shutdown Manager
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info(`\nReceived ${signal}. Initiating graceful shutdown...`);

  try {
    // 1. Stop background services
    stopMetricsReporter();
    stopJobPoller();

    // 2. Pause & close BullMQ workers (allowing active jobs to finish or drain)
    logger.info("Closing BullMQ workers (waiting for active jobs to complete)...");
    await Promise.allSettled([
      heavyComputeWorker.close(),
      dataSyncWorker.close(),
      backorderWorker.close(),
      subscriptionReminderWorker.close(),
    ]);
    logger.info("BullMQ workers closed.");

    // 3. Disconnect Redis
    logger.info("Disconnecting Redis store...");
    await redisConnection.quit();
    logger.info("Redis disconnected.");

    // 4. Disconnect Prisma client from NeonDB
    logger.info("Disconnecting Prisma client from NeonDB...");
    await prisma.$disconnect();
    logger.info("Prisma client disconnected.");

    logger.info("Graceful shutdown completed successfully. Exiting process.");
    process.exit(0);
  } catch (error) {
    logger.error("Error encountered during graceful shutdown:", error);
    process.exit(1);
  }
}

// Register termination signal handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled Promise Rejection caught in worker root:", reason);
});
