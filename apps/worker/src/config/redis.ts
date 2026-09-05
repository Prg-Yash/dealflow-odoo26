import { Redis, type RedisOptions } from "ioredis";
import { ENV } from "./env.js";
import { logger } from "../utils/logger.js";

/**
 * Resolves the Redis connection configuration, automatically handling:
 * 1. Standard rediss:// or redis:// connection URLs (e.g. Upstash TCP endpoint)
 * 2. Automatic conversion of Upstash REST URLs (https://...upstash.io) to rediss://
 * 3. Individual host / port / password configurations
 * 4. Localhost fallback
 */
function resolveRedisConnectionConfig(): { url?: string; options: RedisOptions } {
  let resolvedUrl = ENV.REDIS_URL;

  // If REDIS_URL is not set but UPSTASH_REDIS_REST_URL is present, adapt it for TCP/TLS
  if (!resolvedUrl && ENV.UPSTASH_REDIS_REST_URL) {
    try {
      const parsed = new URL(ENV.UPSTASH_REDIS_REST_URL);
      const host = parsed.hostname;
      const port = parsed.port || "6379";
      const password = ENV.REDIS_PASSWORD || ENV.UPSTASH_REDIS_REST_TOKEN;
      resolvedUrl = password
        ? `rediss://default:${encodeURIComponent(password)}@${host}:${port}`
        : `rediss://${host}:${port}`;
      logger.info(`Constructed Redis TLS connection string from Upstash REST URL: rediss://${host}:${port}`);
    } catch {
      resolvedUrl = ENV.UPSTASH_REDIS_REST_URL;
    }
  }

  // If a URL was provided starting with http:// or https://, transform to rediss:// for ioredis
  if (resolvedUrl && (resolvedUrl.startsWith("https://") || resolvedUrl.startsWith("http://"))) {
    try {
      const parsed = new URL(resolvedUrl);
      const host = parsed.hostname;
      const port = parsed.port || "6379";
      const password = parsed.password || ENV.REDIS_PASSWORD || ENV.UPSTASH_REDIS_REST_TOKEN;
      resolvedUrl = password
        ? `rediss://default:${encodeURIComponent(password)}@${host}:${port}`
        : `rediss://${host}:${port}`;
      logger.info(`Transformed Upstash HTTP URL into native Redis TLS URL: rediss://${host}:${port}`);
    } catch (e) {
      logger.warn(`Failed to parse HTTP URL into Redis URL: ${(e as Error).message}`);
    }
  }

  // Fallback to local Redis if neither URL nor HOST is provided
  if (!resolvedUrl && !ENV.REDIS_HOST) {
    resolvedUrl = "redis://127.0.0.1:6379";
  }

  const isTls =
    ENV.REDIS_TLS ||
    Boolean(resolvedUrl && resolvedUrl.startsWith("rediss://")) ||
    Boolean(ENV.REDIS_HOST && ENV.REDIS_HOST.includes("upstash.io"));

  const options: RedisOptions = {
    maxRetriesPerRequest: null, // Mandatory for BullMQ workers and queues
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 250, 5000);
      logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError(err: Error) {
      logger.warn(`Redis reconnecting due to error: ${err.message}`);
      return true;
    },
  };

  if (isTls) {
    options.tls = {
      rejectUnauthorized: false,
    };
  }

  return { url: resolvedUrl || undefined, options };
}

export function createRedisConnection(): Redis {
  const { url, options } = resolveRedisConnectionConfig();

  const client = url
    ? new Redis(url, options)
    : new Redis({
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT,
        password: ENV.REDIS_PASSWORD,
        ...options,
      });

  client.on("connect", () => {
    logger.info("Redis connection established");
  });

  client.on("error", (err: Error) => {
    logger.error("Redis connection error:", err);
  });

  client.on("close", () => {
    logger.warn("Redis connection closed");
  });

  return client;
}

// Shared Redis connection for BullMQ
export const redisConnection = createRedisConnection();
