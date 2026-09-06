import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const QUEUE_NAMES = {
  HEAVY_COMPUTE: "heavy-compute-queue",
  DATA_SYNC: "data-sync-queue",
  BACKORDER_CONSOLIDATION: "backorder-consolidation-queue",
  SUBSCRIPTION_REMINDER: "subscription-reminder-queue",
} as const;

export interface HeavyComputeJobData {
  jobId?: string;
  taskType: "matrix-multiplication" | "data-aggregation" | "batch-transform";
  parameters?: Record<string, unknown>;
  iterations?: number;
  matrixSize?: number;
  userId?: string;
}

export interface DataSyncJobData {
  syncId?: string;
  targetEntity: string;
  batchSize?: number;
  sourceFilter?: Record<string, unknown>;
}

export interface BackorderConsolidationJobData {
  organizationId: string;
  productId: string;
  warehouseId?: string;
  triggeredAt?: string;
}

export interface SubscriptionReminderJobData {
  subscriptionId: string;
  subscriptionNumber: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  billingInterval: "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  nextBillingDate: string;
  amount: number;
  reminderDaysBefore?: number;
  triggeredAt?: string;
  manualTrigger?: boolean;
}

// Queue options with automatic retries and exponential backoff
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 500,
    age: 24 * 3600, // 24 hours
  },
  removeOnFail: {
    count: 1000,
    age: 7 * 24 * 3600, // 7 days
  },
};

export const heavyComputeQueue = new Queue<HeavyComputeJobData>(
  QUEUE_NAMES.HEAVY_COMPUTE,
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

export const dataSyncQueue = new Queue<DataSyncJobData>(
  QUEUE_NAMES.DATA_SYNC,
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

export const backorderConsolidationQueue = new Queue<BackorderConsolidationJobData>(
  QUEUE_NAMES.BACKORDER_CONSOLIDATION,
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

export const subscriptionReminderQueue = new Queue<SubscriptionReminderJobData>(
  QUEUE_NAMES.SUBSCRIPTION_REMINDER,
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);
