import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface SubscriptionLineDetail {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  recurringAmount: number;
}

export interface OneTimeLineDetail {
  name: string;
  quantity: number;
  amount: number;
}

export interface InvoiceSummaryDetail {
  invoiceNumber: string;
  status: string;
  dueDate: string | Date;
  totalAmount: number;
}

export interface SubscriptionReminderEmailPayload {
  // Subscriber Information
  customerName: string;
  customerEmail: string;
  companyName?: string;
  customerPhone?: string;

  // Organization & Context
  organizationName?: string;
  currency?: string;

  // Subscription Core Info
  subscriptionId: string;
  subscriptionNumber: string;
  planName: string;
  status: string;
  billingInterval: "MONTHLY" | "QUARTERLY" | "ANNUALLY" | string;
  nextBillingDate: string | Date;
  amount: number;
  autoRenew: boolean;
  currentMrr?: number;
  currentArr?: number;
  reminderDaysBefore?: number;
  manualTrigger?: boolean;

  // Granular Line Items
  recurringLines?: SubscriptionLineDetail[];
  oneTimeLines?: OneTimeLineDetail[];
  invoices?: InvoiceSummaryDetail[];

  // Links & Support
  portalUrl?: string;
  supportEmail?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  fallbackLogged?: boolean;
  error?: string;
}

/**
 * Formats a currency amount with symbol and regional commas.
 */
function formatCurrency(amount: number, currency = "INR"): string {
  const symMap: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED ",
    SGD: "S$",
  };
  const sym = symMap[currency.toUpperCase()] || `${currency.toUpperCase()} `;
  return `${sym}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a date nicely for humans (e.g., "Oct 6, 2026").
 */
function formatDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Calculates remaining days until billing date.
 */
function getRemainingDays(dateInput: string | Date): number {
  try {
    const target = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Sends a rich, dynamically generated subscription renewal reminder email using SMTP.
 * If SMTP credentials are not configured in environment variables, outputs a structured
 * visual payload to the worker logs for local testing.
 */
export async function sendSubscriptionReminderEmail(
  payload: SubscriptionReminderEmailPayload
): Promise<SendEmailResult> {
  const {
    customerName,
    customerEmail,
    companyName,
    organizationName = "DealFlow 360",
    currency = "INR",
    subscriptionId,
    subscriptionNumber,
    planName,
    status = "ACTIVE",
    billingInterval = "MONTHLY",
    nextBillingDate,
    amount,
    autoRenew = true,
    recurringLines = [],
    oneTimeLines = [],
    invoices = [],
    portalUrl,
  } = payload;

  const formattedDate = formatDate(nextBillingDate);
  const formattedAmount = formatCurrency(amount, currency);
  const daysLeft = getRemainingDays(nextBillingDate);

  const billingUrl =
    portalUrl || `${ENV.WEB_ORIGIN}/dashboard/finance/subscriptions/${subscriptionId}`;

  // Relative timing text
  let timingBadgeText = `Due in ${daysLeft} days`;
  if (daysLeft <= 0) timingBadgeText = "Due Today";
  else if (daysLeft === 1) timingBadgeText = "Due Tomorrow";

  const cadenceLabel =
    billingInterval.toUpperCase() === "QUARTERLY"
      ? "Quarterly"
      : billingInterval.toUpperCase() === "ANNUALLY"
      ? "Annual"
      : "Monthly";

  const subject = `Upcoming Subscription Renewal Notice: ${planName} (${formattedAmount})`;

  // =========================================================================
  // HTML Template Generation
  // =========================================================================

  const recurringLinesHtml =
    recurringLines.length > 0
      ? recurringLines
          .map(
            (line) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; font-weight: 600; color: #0f172a;">
            ${line.name}
            ${line.description ? `<div style="font-size: 11px; color: #64748b; font-weight: 400; margin-top: 2px;">${line.description}</div>` : ""}
          </td>
          <td style="padding: 12px 16px; text-align: center; color: #475569; font-size: 13px;">${cadenceLabel}</td>
          <td style="padding: 12px 16px; text-align: center; color: #475569; font-size: 13px;">${formattedDate}</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">
            ${formatCurrency(line.recurringAmount, currency)}
          </td>
        </tr>`
          )
          .join("")
      : `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; font-weight: 600; color: #0f172a;">${planName}</td>
          <td style="padding: 12px 16px; text-align: center; color: #475569; font-size: 13px;">${cadenceLabel}</td>
          <td style="padding: 12px 16px; text-align: center; color: #475569; font-size: 13px;">${formattedDate}</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${formattedAmount}</td>
        </tr>`;

  const oneTimeLinesHtml =
    oneTimeLines.length > 0
      ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">
          One-Time Lines (From Originating Order)
        </h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 13px; border-collapse: separate; border-spacing: 0; overflow: hidden;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #64748b; letter-spacing: 0.5px;">
              <th style="padding: 10px 16px; text-align: left; font-weight: 700;">Product</th>
              <th style="padding: 10px 16px; text-align: center; font-weight: 700;">Qty</th>
              <th style="padding: 10px 16px; text-align: right; font-weight: 700;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${oneTimeLines
              .map(
                (ot) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 16px; font-weight: 600; color: #0f172a;">${ot.name}</td>
                <td style="padding: 10px 16px; text-align: center; color: #475569;">${ot.quantity}</td>
                <td style="padding: 10px 16px; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">
                  ${formatCurrency(ot.amount, currency)}
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      : "";

  const invoicesHtml =
    invoices.length > 0
      ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">
          Proration Invoices &amp; Credit Ledger
        </h3>
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
          ${invoices
            .map(
              (inv) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
              <div>
                <strong style="color: #0f172a; font-family: monospace; font-size: 13px;">${inv.invoiceNumber}</strong>
                <span style="display: inline-block; margin-left: 8px; background-color: #dcfce7; color: #15803d; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">${inv.status}</span>
                <span style="color: #64748b; font-size: 12px; margin-left: 8px;">Due ${formatDate(inv.dueDate)}</span>
              </div>
              <div style="font-weight: 700; font-family: monospace; color: #0f172a; font-size: 13px;">
                Total: ${formatCurrency(inv.totalAmount, currency)}
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>`
      : "";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 36px 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background: linear-gradient(135deg, #ff5e3a, #ea4e28); border-radius: 10px; padding: 8px 14px; font-weight: 900; font-size: 14px; color: #ffffff; letter-spacing: 0.5px;">
                      DEALFLOW 360
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600;">
                      ${organizationName} &bull; Automated Subscription Engine
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
                      ${status}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading & Subscriber Info -->
          <tr>
            <td style="padding-top: 24px; padding-bottom: 20px;">
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                Billing Detail: ${customerName} &ndash; ${planName}
              </h1>
              <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                Hello <strong>${customerName}</strong>${companyName ? ` (${companyName})` : ""}, this is your automated renewal reminder for subscription <strong>${subscriptionNumber}</strong>.
              </p>
            </td>
          </tr>

          <!-- Primary Metric Highlight Box -->
          <tr>
            <td style="padding-bottom: 24px;">
              <div style="background: linear-gradient(135deg, #fff7f5, #fef2f2); border: 1px solid #fed7aa; border-radius: 16px; padding: 20px; box-shadow: 0 2px 4px rgba(255, 94, 58, 0.04);">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="33%" style="border-right: 1px solid #fed7aa; padding-right: 12px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #c2410c; letter-spacing: 0.5px;">
                        Next Bill Date
                      </div>
                      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                        ${formattedDate}
                      </div>
                      <div style="font-size: 11px; color: #ea580c; font-weight: 600; margin-top: 2px;">
                        ${timingBadgeText}
                      </div>
                    </td>
                    <td width="33%" style="border-right: 1px solid #fed7aa; padding-left: 16px; padding-right: 12px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #c2410c; letter-spacing: 0.5px;">
                        Recurring Cadence
                      </div>
                      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                        ${cadenceLabel}
                      </div>
                      <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 2px;">
                        ${autoRenew ? "Auto-Renew (Active)" : "Manual Renewal"}
                      </div>
                    </td>
                    <td width="33%" style="padding-left: 16px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #c2410c; letter-spacing: 0.5px;">
                        Recurring Total
                      </div>
                      <div style="font-size: 18px; font-weight: 900; color: #ff5e3a; margin-top: 4px; font-family: monospace;">
                        ${formattedAmount}
                      </div>
                      <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px;">
                        per ${cadenceLabel.toLowerCase()} cycle
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Recurring Lines Table -->
          <tr>
            <td style="padding-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                Recurring Lines
              </h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 13px; border-collapse: separate; border-spacing: 0; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #64748b; letter-spacing: 0.5px;">
                    <th style="padding: 10px 16px; text-align: left; font-weight: 700;">Plan</th>
                    <th style="padding: 10px 16px; text-align: center; font-weight: 700;">Cycle</th>
                    <th style="padding: 10px 16px; text-align: center; font-weight: 700;">Next Bill Date</th>
                    <th style="padding: 10px 16px; text-align: right; font-weight: 700;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${recurringLinesHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- One-Time Lines (from originating order) -->
          ${oneTimeLinesHtml ? `<tr><td>${oneTimeLinesHtml}</td></tr>` : ""}

          <!-- Proration Invoices & Credit Ledger -->
          ${invoicesHtml ? `<tr><td>${invoicesHtml}</td></tr>` : ""}

          <!-- BullMQ Background Bus Notice Callout -->
          <tr>
            <td style="padding-top: 24px; padding-bottom: 28px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
                <div style="font-size: 11px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  ⚡ BullMQ Background Renewal Reminder Bus
                </div>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px;">
                  <tr>
                    <td style="color: #64748b; width: 33%;">CHANNEL QUEUE<br><strong style="color: #0f172a; font-family: monospace;">subscription-reminder-queue</strong></td>
                    <td style="color: #64748b; width: 33%;">RECIPIENT ACCOUNT<br><strong style="color: #0f172a;">${customerEmail}</strong></td>
                    <td style="color: #64748b; width: 33%;">RENEWAL CADENCE<br><strong style="color: #059669;">${autoRenew ? "Auto-Renew (Active)" : "Manual Notice"}</strong></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Action Button (CTA) -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${billingUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff5e3a, #ea4e28); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 12px rgba(255, 94, 58, 0.35);">
                Manage Subscription &amp; Invoices
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              This is an automated billing notification sent on behalf of <strong>${organizationName}</strong>.<br>
              Direct Link: <a href="${billingUrl}" style="color: #ff5e3a; text-decoration: none;">${billingUrl}</a><br>
              &copy; 2026 DealFlow 360 Orchestration Platform. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // =========================================================================
  // Plain-Text Fallback
  // =========================================================================

  const textContent = `
============================================================
  DEALFLOW 360 & ${organizationName.toUpperCase()}
  AUTOMATED SUBSCRIPTION RENEWAL REMINDER
============================================================

Hello ${customerName}${companyName ? ` (${companyName})` : ""},

This is an automated renewal notice for your subscription.

SUBSCRIPTION DETAILS:
- Plan Name      : ${planName}
- Subscription # : ${subscriptionNumber}
- Status         : ${status}
- Billing Cycle  : ${cadenceLabel}
- Next Bill Date : ${formattedDate} (${timingBadgeText})
- Recurring Total: ${formattedAmount}
- Auto-Renew     : ${autoRenew ? "Active" : "Manual Renewal Required"}

RECURRING LINES:
${recurringLines.map((l) => `  * ${l.name} - Qty: ${l.quantity} - ${formatCurrency(l.recurringAmount, currency)}`).join("\n") || `  * ${planName} - ${formattedAmount}`}

${
  oneTimeLines.length > 0
    ? `ONE-TIME LINES (FROM ORIGINATING ORDER):
${oneTimeLines.map((o) => `  * ${o.name} - Qty: ${o.quantity} - ${formatCurrency(o.amount, currency)}`).join("\n")}\n`
    : ""
}
${
  invoices.length > 0
    ? `RECENT INVOICES:
${invoices.map((inv) => `  * ${inv.invoiceNumber} (${inv.status}) - Due: ${formatDate(inv.dueDate)} - Total: ${formatCurrency(inv.totalAmount, currency)}`).join("\n")}\n`
    : ""
}
Manage your subscription and invoices at:
${billingUrl}

============================================================
DealFlow 360 Background Worker Service
`;

  // =========================================================================
  // SMTP Delivery Execution
  // =========================================================================

  // If SMTP credentials are not set, output formatted log banner for testing
  if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
    logger.info("\n==================================================");
    logger.info("  ✉️  SUBSCRIPTION REMINDER EMAIL (SMTP DEMO DISPATCH)");
    logger.info(`  To           : ${customerName} <${customerEmail}>`);
    logger.info(`  Subject      : ${subject}`);
    logger.info(`  Subscription : ${subscriptionNumber} (${planName})`);
    logger.info(`  Next Bill    : ${formattedDate} (${timingBadgeText})`);
    logger.info(`  Total Amount : ${formattedAmount} (${cadenceLabel})`);
    logger.info(`  Auto-Renew   : ${autoRenew ? "Yes (Active)" : "No"}`);
    logger.info(`  Portal Link  : ${billingUrl}`);
    logger.info("  (To deliver live Gmail/SMTP emails, configure SMTP_USER and SMTP_PASS in worker .env)");
    logger.info("==================================================\n");
    return { success: true, fallbackLogged: true };
  }

  try {
    let nodemailer: typeof import("nodemailer");
    try {
      const nodemailerModule = await import("nodemailer");
      nodemailer = nodemailerModule.default || nodemailerModule;
    } catch {
      logger.warn(
        `[EmailService] 'nodemailer' not found in runtime environment. Logged reminder payload for ${customerEmail}.`
      );
      return { success: true, fallbackLogged: true };
    }

    const transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: ENV.SMTP_FROM,
      to: customerEmail,
      subject,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(
      `[EmailService] ✅ Subscription reminder email delivered via SMTP to ${customerEmail} (Message ID: ${info.messageId})`
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    logger.error(
      `[EmailService] ❌ Failed to send subscription reminder email to ${customerEmail}: ${error?.message}`,
      { error }
    );
    return {
      success: false,
      error: error?.message || "Failed to deliver SMTP email",
    };
  }
}
