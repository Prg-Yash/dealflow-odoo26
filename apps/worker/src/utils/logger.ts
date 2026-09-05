import { ENV } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (ENV.LOG_LEVEL.toLowerCase() in LOG_LEVELS
  ? ENV.LOG_LEVEL.toLowerCase()
  : "info") as LogLevel;

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const workerTag = `[${ENV.WORKER_ID}]`;
  const levelTag = `[${level.toUpperCase().padEnd(5)}]`;

  let formatted = `${timestamp} ${levelTag} ${workerTag} ${message}`;
  if (meta !== undefined) {
    if (meta instanceof Error) {
      formatted += `\n${meta.stack ?? meta.message}`;
    } else if (typeof meta === "object") {
      formatted += ` ${JSON.stringify(meta)}`;
    } else {
      formatted += ` ${String(meta)}`;
    }
  }
  return formatted;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (LOG_LEVELS.debug >= LOG_LEVELS[currentLevel]) {
      console.debug(formatMessage("debug", message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (LOG_LEVELS.info >= LOG_LEVELS[currentLevel]) {
      console.log(formatMessage("info", message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (LOG_LEVELS.warn >= LOG_LEVELS[currentLevel]) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
  error(message: string, meta?: unknown) {
    if (LOG_LEVELS.error >= LOG_LEVELS[currentLevel]) {
      console.error(formatMessage("error", message, meta));
    }
  },
};
