import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

export const SUBSCRIPTION_REMINDER_QUEUE_NAME = "subscription-reminder-queue";

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

let subscriptionReminderQueue: Queue<SubscriptionReminderJobData> | null = null;

export function getSubscriptionReminderQueue(): Queue<SubscriptionReminderJobData> {
  if (!subscriptionReminderQueue) {
    const connection = getRedisConnection();
    subscriptionReminderQueue = new Queue<SubscriptionReminderJobData>(
      SUBSCRIPTION_REMINDER_QUEUE_NAME,
      {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }
    );

    subscriptionReminderQueue.on("error", () => {
      // Suppress connection failure spam when Redis is offline in dev
    });
  }
  return subscriptionReminderQueue;
}

/**
 * Enqueues an automated renewal / billing reminder job into the BullMQ bus channel.
 * Fails safely without throwing if Redis is unavailable.
 */
export async function enqueueSubscriptionReminder(data: SubscriptionReminderJobData) {
  try {
    const queue = getSubscriptionReminderQueue();
    const jobId = `reminder-${data.subscriptionId}-${Date.now()}`;
    await queue.add("dispatch-subscription-reminder", data, { jobId });
    return { success: true, jobId };
  } catch (err: any) {
    console.warn(`[BullMQ] Could not enqueue subscription reminder (Redis may be offline): ${err?.message}`);
    return { success: false, error: err?.message };
  }
}
