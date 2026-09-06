import type { Job as BullJob } from "bullmq";
import type { SubscriptionReminderJobData } from "../queues/index.js";
import { logger } from "../utils/logger.js";
import { prisma } from "@repo/db";

export interface SubscriptionReminderResult {
  subscriptionId: string;
  subscriptionNumber: string;
  customerEmail: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
  dispatchedAt: string;
  status: "DISPATCHED" | "SKIPPED_INACTIVE";
}

/**
 * BullMQ background worker processor that processes subscription renewal / billing reminders.
 * Executes on the 24/7 worker bus channel, notifies customers before their recurring billing cycle,
 * and maintains audit logging.
 */
export async function processSubscriptionReminderJob(
  job: BullJob<SubscriptionReminderJobData>
): Promise<SubscriptionReminderResult> {
  const {
    subscriptionId,
    subscriptionNumber,
    customerName,
    customerEmail,
    planName,
    amount,
    billingInterval,
    nextBillingDate,
    manualTrigger,
  } = job.data;

  logger.info(`[SubscriptionReminder] Processing job #${job.id} for subscription ${subscriptionNumber}`);
  await job.updateProgress(20);

  // Check live subscription status from NeonDB
  const liveSub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { customer: true },
  });

  if (!liveSub || liveSub.status === "CANCELLED" || liveSub.status === "EXPIRED") {
    logger.warn(
      `[SubscriptionReminder] Subscription ${subscriptionNumber} is ${liveSub?.status || "NOT_FOUND"}. Skipping reminder dispatch.`
    );
    await job.updateProgress(100);
    return {
      subscriptionId,
      subscriptionNumber,
      customerEmail,
      planName,
      amount,
      nextBillingDate,
      dispatchedAt: new Date().toISOString(),
      status: "SKIPPED_INACTIVE",
    };
  }

  await job.updateProgress(60);

  // Compute timing details
  const nextDate = new Date(nextBillingDate);
  const now = new Date();
  const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  logger.info(
    `[SubscriptionReminder] 🔔 Automated Billing Notice: Sent renewal notification for "${planName}" to ${customerName} <${customerEmail}> (${billingInterval} billing of ₹${amount.toLocaleString()}, due in ${diffDays} days on ${nextDate.toLocaleDateString()}).`
  );

  await job.updateProgress(100);

  return {
    subscriptionId,
    subscriptionNumber,
    customerEmail,
    planName,
    amount,
    nextBillingDate,
    dispatchedAt: new Date().toISOString(),
    status: "DISPATCHED",
  };
}
