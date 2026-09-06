import type { Job as BullJob } from "bullmq";
import type { SubscriptionReminderJobData } from "../queues/index.js";
import { logger } from "../utils/logger.js";
import { prisma } from "@repo/db";
import {
  sendSubscriptionReminderEmail,
  type SubscriptionReminderEmailPayload,
  type SubscriptionLineDetail,
  type OneTimeLineDetail,
  type InvoiceSummaryDetail,
} from "../services/email.service.js";

export interface SubscriptionReminderResult {
  subscriptionId: string;
  subscriptionNumber: string;
  customerEmail: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
  dispatchedAt: string;
  emailDelivered: boolean;
  messageId?: string;
  status: "DISPATCHED" | "SKIPPED_INACTIVE" | "FAILED";
  error?: string;
}

/**
 * BullMQ background worker processor that processes subscription renewal / billing reminders.
 * Executes on the 24/7 worker bus channel, formats dynamic content for subscriber & subscription,
 * delivers a branded email via SMTP (nodemailer), and logs execution metrics.
 */
export async function processSubscriptionReminderJob(
  job: BullJob<SubscriptionReminderJobData>
): Promise<SubscriptionReminderResult> {
  const {
    subscriptionId,
    subscriptionNumber,
    customerName: payloadCustomerName,
    customerEmail: payloadCustomerEmail,
    planName: payloadPlanName,
    amount: payloadAmount,
    billingInterval: payloadBillingInterval,
    nextBillingDate: payloadNextBillingDate,
    reminderDaysBefore,
    manualTrigger,
  } = job.data;

  logger.info(
    `[SubscriptionReminder] 🚀 Processing BullMQ job #${job.id} for subscription ${subscriptionNumber} (${payloadCustomerEmail})`
  );
  await job.updateProgress(15);

  // 1. Fetch live subscription state from NeonDB with rich relations
  let liveSub: any = null;
  try {
    liveSub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: true,
        organization: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        quotation: {
          include: {
            lines: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  } catch (err: any) {
    logger.warn(`[SubscriptionReminder] DB query fallback note for ${subscriptionId}: ${err?.message}`);
  }

  await job.updateProgress(35);

  // If live subscription exists in DB and is cancelled/expired, skip reminder unless manually triggered
  if (liveSub && (liveSub.status === "CANCELLED" || liveSub.status === "EXPIRED") && !manualTrigger) {
    logger.warn(
      `[SubscriptionReminder] Subscription ${subscriptionNumber} is ${liveSub.status}. Skipping automated reminder dispatch.`
    );
    await job.updateProgress(100);
    return {
      subscriptionId,
      subscriptionNumber,
      customerEmail: liveSub.customer?.email || payloadCustomerEmail,
      planName: payloadPlanName,
      amount: payloadAmount,
      nextBillingDate: payloadNextBillingDate,
      dispatchedAt: new Date().toISOString(),
      emailDelivered: false,
      status: "SKIPPED_INACTIVE",
    };
  }

  // 2. Synthesize dynamic subscriber & plan details
  const customerName = liveSub?.customer?.name || payloadCustomerName || "Subscriber";
  const customerEmail = liveSub?.customer?.email || payloadCustomerEmail;
  const companyName = liveSub?.customer?.company || (liveSub?.customer as any)?.companyName;
  const organizationName = liveSub?.organization?.name || "DealFlow 360";
  const currency = liveSub?.organization?.currency || "INR";

  const billingInterval = liveSub?.billingInterval || payloadBillingInterval || "MONTHLY";
  const nextBillingDate = liveSub?.nextBillingDate?.toISOString() || payloadNextBillingDate;
  const status = liveSub?.status || "ACTIVE";
  const autoRenew = liveSub?.autoRenew ?? true;

  // Recurring lines
  let recurringLines: SubscriptionLineDetail[] = [];
  if (liveSub?.lines && liveSub.lines.length > 0) {
    recurringLines = liveSub.lines.map((l: any) => ({
      name: l.product?.name || payloadPlanName || "Subscription Plan",
      description: l.product?.description || null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      recurringAmount: l.recurringAmount,
    }));
  } else {
    recurringLines = [
      {
        name: payloadPlanName || "Subscription Plan",
        description: "Enterprise Subscription Service",
        quantity: 1,
        unitPrice: payloadAmount || 0,
        recurringAmount: payloadAmount || 0,
      },
    ];
  }

  const calculatedAmount =
    liveSub?.lines && liveSub.lines.length > 0
      ? liveSub.lines.reduce((sum: number, l: any) => sum + l.recurringAmount, 0)
      : payloadAmount || 0;

  const planName =
    recurringLines.map((l) => l.name).filter(Boolean).join(", ") || payloadPlanName || "Subscription Plan";

  // One-time lines (from originating quotation / order if present)
  const oneTimeLines: OneTimeLineDetail[] = [];
  if (liveSub?.quotation?.lines && liveSub.quotation.lines.length > 0) {
    liveSub.quotation.lines.forEach((ql: any) => {
      // If quotation line is physical hardware or one-time service
      const isRecurring =
        ql.itemType === "SUBSCRIPTION" ||
        liveSub.lines?.some((sl: any) => sl.quotationLineId === ql.id || sl.productId === ql.productId);

      if (!isRecurring && ql.product) {
        oneTimeLines.push({
          name: ql.product.name,
          quantity: ql.quantity,
          amount: ql.totalAmount ?? ql.unitPrice * ql.quantity,
        });
      }
    });
  }

  // Invoices & Proration history
  const invoiceSummaries: InvoiceSummaryDetail[] = [];
  if (liveSub?.invoices && liveSub.invoices.length > 0) {
    liveSub.invoices.forEach((inv: any) => {
      invoiceSummaries.push({
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
      });
    });
  }

  await job.updateProgress(65);

  // 3. Construct email payload
  const emailPayload: SubscriptionReminderEmailPayload = {
    customerName,
    customerEmail,
    companyName,
    organizationName,
    currency,
    subscriptionId,
    subscriptionNumber: liveSub?.subscriptionNumber || subscriptionNumber,
    planName,
    status,
    billingInterval,
    nextBillingDate,
    amount: calculatedAmount,
    autoRenew,
    currentMrr: liveSub?.currentMrr ?? calculatedAmount,
    currentArr: liveSub?.currentArr ?? calculatedAmount * 12,
    reminderDaysBefore,
    manualTrigger,
    recurringLines,
    oneTimeLines,
    invoices: invoiceSummaries,
  };

  // 4. Dispatch Email via SMTP
  logger.info(
    `[SubscriptionReminder] ✉️ Dispatching SMTP reminder email to ${customerName} <${customerEmail}> for plan "${planName}" (${currency} ${calculatedAmount})`
  );

  const emailResult = await sendSubscriptionReminderEmail(emailPayload);

  await job.updateProgress(100);

  if (!emailResult.success && emailResult.error) {
    logger.error(`[SubscriptionReminder] ❌ Email delivery failed: ${emailResult.error}`);
    return {
      subscriptionId,
      subscriptionNumber,
      customerEmail,
      planName,
      amount: calculatedAmount,
      nextBillingDate,
      dispatchedAt: new Date().toISOString(),
      emailDelivered: false,
      error: emailResult.error,
      status: "FAILED",
    };
  }

  logger.info(
    `[SubscriptionReminder] ✨ Successfully processed reminder job #${job.id} for ${customerEmail}. Message ID: ${emailResult.messageId || "SMTP_DISPATCHED"}`
  );

  return {
    subscriptionId,
    subscriptionNumber,
    customerEmail,
    planName,
    amount: calculatedAmount,
    nextBillingDate,
    dispatchedAt: new Date().toISOString(),
    emailDelivered: true,
    messageId: emailResult.messageId,
    status: "DISPATCHED",
  };
}
