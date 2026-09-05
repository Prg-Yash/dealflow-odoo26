import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const QUEUE_NAMES = {
  HEAVY_COMPUTE: "heavy-compute-queue",
  DATA_SYNC: "data-sync-queue",
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
