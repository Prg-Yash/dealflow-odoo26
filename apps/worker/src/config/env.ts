import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  WORKER_ID: process.env.WORKER_ID ?? `worker-${process.pid}-${Math.random().toString(36).substring(2, 7)}`,
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
  REDIS_URL: process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || "",
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || "",
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || process.env.UPSTASH_REDIS_PASSWORD,
  REDIS_TLS: process.env.REDIS_TLS === "true",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  METRICS_INTERVAL_MS: parseInt(process.env.METRICS_INTERVAL_MS ?? "30000", 10),
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
} as const;
