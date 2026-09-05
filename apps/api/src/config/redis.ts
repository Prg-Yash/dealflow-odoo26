import { Redis, type RedisOptions } from "ioredis";

function resolveRedisConnectionConfig(): { url?: string; options: RedisOptions } {
  let resolvedUrl = process.env.REDIS_URL;
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!resolvedUrl && restUrl) {
    try {
      const parsed = new URL(restUrl);
      const host = parsed.hostname;
      const port = parsed.port || "6379";
      const password = process.env.REDIS_PASSWORD || restToken;
      resolvedUrl = password
        ? `rediss://default:${encodeURIComponent(password)}@${host}:${port}`
        : `rediss://${host}:${port}`;
    } catch {
      resolvedUrl = restUrl;
    }
  }

  if (!resolvedUrl && !process.env.REDIS_HOST) {
    resolvedUrl = "redis://127.0.0.1:6379";
  }

  const isTls =
    process.env.REDIS_TLS === "true" ||
    Boolean(resolvedUrl && resolvedUrl.startsWith("rediss://")) ||
    Boolean(process.env.REDIS_HOST && process.env.REDIS_HOST.includes("upstash.io"));

  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 250, 2000);
    },
  };

  if (isTls) {
    options.tls = { rejectUnauthorized: false };
  }

  return { url: resolvedUrl || undefined, options };
}

let redisInstance: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisInstance) {
    const { url, options } = resolveRedisConnectionConfig();
    redisInstance = url
      ? new Redis(url, options)
      : new Redis({
          host: process.env.REDIS_HOST || "127.0.0.1",
          port: parseInt(process.env.REDIS_PORT || "6379", 10),
          password: process.env.REDIS_PASSWORD,
          ...options,
        });

    redisInstance.on("error", () => {
      // Suppress connection failure spam in dev/test
    });
  }
  return redisInstance;
}
