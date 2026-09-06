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
  // SMTP / Mail Configuration
  SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? "465", 10),
  SMTP_SECURE: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
  SMTP_USER: process.env.SMTP_USER || process.env.GMAIL_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "",
  SMTP_FROM:
    process.env.SMTP_FROM ||
    (process.env.SMTP_USER
      ? `DealFlow 360 Billing <${process.env.SMTP_USER}>`
      : "DealFlow 360 Billing <billing@dealflow360.com>"),
  WEB_ORIGIN: process.env.WEB_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;
