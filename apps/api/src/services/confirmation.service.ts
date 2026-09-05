import {
  prisma,
  CategoryType,
  QuoteStage,
  ApprovalStatus,
  InvoiceStatus,
  SubscriptionStatus,
  BillingInterval,
  FulfillmentStatus,
  UserRole,
  type Prisma,
} from "@repo/db";
import { AppError } from "../middleware/error.js";

export interface ConfirmQuotationResult {
  quotation: any;
  invoices: any[];
  subscriptions: any[];
  fulfillmentOrder: any | null;
}

async function generateUniqueInvoiceNumber(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const count = await tx.invoice.count();
  let num = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
  const existing = await tx.invoice.findUnique({ where: { invoiceNumber: num } });
  if (existing) {
    num = `INV-${year}-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return num;
}

async function generateUniqueSubscriptionNumber(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const count = await tx.subscription.count();
  let num = `SUB-${year}-${String(count + 1).padStart(4, "0")}`;
  const existing = await tx.subscription.findUnique({ where: { subscriptionNumber: num } });
  if (existing) {
    num = `SUB-${year}-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return num;
}

async function generateUniqueFulfillmentNumber(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const count = await tx.fulfillmentOrder.count();
  let num = `FUL-${year}-${String(count + 1).padStart(4, "0")}`;
  const existing = await tx.fulfillmentOrder.findUnique({ where: { fulfillmentNumber: num } });
  if (existing) {
    num = `FUL-${year}-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return num;
}

/**
 * Phase 7 centralized deal confirmation logic.
 * Transforms an approved/signed quotation into commercial billing invoices,
 * recurring subscriptions, and multi-item warehouse fulfillment orders.
 */
export async function confirmQuotation(
  tx: Prisma.TransactionClient,
  quotationId: string,
  orgId: string,
  actorId?: string,
  actorRole: UserRole = UserRole.CUSTOMER
): Promise<ConfirmQuotationResult> {
  const quotation = await tx.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: {
      customer: true,
      salesRep: { include: { user: true } },
      lines: {
        include: {
          product: { include: { category: true } },
          variant: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      invoices: true,
      subscriptions: true,
      fulfillmentOrder: true,
    },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  // Update Quotation Stage
  const updatedQuotation = await tx.quotation.update({
    where: { id: quotationId },
    data: {
      stage: QuoteStage.CONFIRMED,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    include: {
      customer: true,
      salesRep: { include: { user: true } },
      lines: {
        include: {
          product: { include: { category: true } },
          variant: true,
        },
      },
    },
  });

  const createdInvoices: any[] = [];
  const createdSubscriptions: any[] = [];
  let createdFulfillmentOrder: any = null;

  const year = new Date().getFullYear();
  const now = new Date();
  const net30DueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const oneTimeLines = quotation.lines.filter(
    (line) => line.itemType === CategoryType.HARDWARE || line.itemType === CategoryType.SERVICE
  );

  const subscriptionLines = quotation.lines.filter(
    (line) => line.itemType === CategoryType.SUBSCRIPTION
  );

  const hardwareLines = quotation.lines.filter(
    (line) => line.itemType === CategoryType.HARDWARE
  );

  // 1. Generate One-Time Invoice for Hardware & Professional Services
  if (oneTimeLines.length > 0) {
    const existingInv = await tx.invoice.findFirst({
      where: { quotationId: quotation.id, subscriptionId: null },
    });

    if (!existingInv) {
      const invoiceNumber = await generateUniqueInvoiceNumber(tx, year);

      let subtotal = 0;
      let discountTotal = 0;
      let totalAmount = 0;

      for (const line of oneTimeLines) {
        const gross = line.unitPrice * line.quantity;
        const discount = gross * (line.discountPercent / 100);
        const net = gross - discount;
        subtotal += gross;
        discountTotal += discount;
        totalAmount += net;
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          organizationId: orgId,
          status: InvoiceStatus.ISSUED,
          issueDate: now,
          dueDate: net30DueDate,
          paymentTerms: "Net 30",
          subtotal: Math.round(subtotal * 100) / 100,
          discountTotal: Math.round(discountTotal * 100) / 100,
          taxTotal: 0.0,
          totalAmount: Math.round(totalAmount * 100) / 100,
          amountPaid: 0.0,
          amountRemaining: Math.round(totalAmount * 100) / 100,
          notes: `Commercial invoice for confirmed quotation ${quotation.quoteNumber}.`,
          lines: {
            create: oneTimeLines.map((line) => {
              const gross = line.unitPrice * line.quantity;
              const discount = gross * (line.discountPercent / 100);
              const net = gross - discount;
              return {
                quotationLineId: line.id,
                productId: line.productId,
                variantId: line.variantId,
                description: line.description || line.product.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                totalAmount: Math.round(net * 100) / 100,
                isRecurring: false,
              };
            }),
          },
        },
        include: { lines: true },
      });

      createdInvoices.push(invoice);
    } else {
      createdInvoices.push(existingInv);
    }
  }

  // 2. Generate Recurring Subscription & Subscription Invoices
  if (subscriptionLines.length > 0) {
    const existingSub = await tx.subscription.findFirst({
      where: { quotationId: quotation.id },
    });

    if (!existingSub) {
      const subscriptionNumber = await generateUniqueSubscriptionNumber(tx, year);

      let currentMrr = 0;
      const subLinesData = subscriptionLines.map((line) => {
        const gross = line.unitPrice * line.quantity;
        const discount = gross * (line.discountPercent / 100);
        const recurringAmount = gross - discount;
        currentMrr += recurringAmount;

        return {
          quotationLineId: line.id,
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          recurringAmount: Math.round(recurringAmount * 100) / 100,
        };
      });

      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const nextBilling = new Date(periodEnd);

      const subscription = await tx.subscription.create({
        data: {
          subscriptionNumber,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          organizationId: orgId,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: BillingInterval.MONTHLY,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: nextBilling,
          currentMrr: Math.round(currentMrr * 100) / 100,
          currentArr: Math.round(currentMrr * 12 * 100) / 100,
          autoRenew: true,
          notes: `Recurring SaaS agreement for quotation ${quotation.quoteNumber}.`,
          lines: {
            create: subLinesData,
          },
        },
        include: { lines: true },
      });

      createdSubscriptions.push(subscription);

      // Generate first billing cycle invoice for the subscription
      const recurringInvoiceNumber = await generateUniqueInvoiceNumber(tx, year);

      const recurringInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: recurringInvoiceNumber,
          quotationId: quotation.id,
          subscriptionId: subscription.id,
          customerId: quotation.customerId,
          organizationId: orgId,
          status: InvoiceStatus.ISSUED,
          issueDate: now,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Net 15 for recurring
          paymentTerms: "Net 15",
          subtotal: Math.round(currentMrr * 100) / 100,
          discountTotal: 0.0,
          taxTotal: 0.0,
          totalAmount: Math.round(currentMrr * 100) / 100,
          amountPaid: 0.0,
          amountRemaining: Math.round(currentMrr * 100) / 100,
          notes: `Monthly recurring subscription invoice (Period: Month 1).`,
          lines: {
            create: subscriptionLines.map((line) => {
              const gross = line.unitPrice * line.quantity;
              const discount = gross * (line.discountPercent / 100);
              const net = gross - discount;
              return {
                quotationLineId: line.id,
                productId: line.productId,
                variantId: line.variantId,
                description: line.description || line.product.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                totalAmount: Math.round(net * 100) / 100,
                isRecurring: true,
              };
            }),
          },
        },
        include: { lines: true },
      });

      createdInvoices.push(recurringInvoice);
    } else {
      createdSubscriptions.push(existingSub);
    }
  }

  // 3. Generate Fulfillment Order for Physical Hardware
  if (hardwareLines.length > 0) {
    const existingFul = await tx.fulfillmentOrder.findFirst({
      where: { quotationId: quotation.id },
    });

    if (!existingFul) {
      const fulfillmentNumber = await generateUniqueFulfillmentNumber(tx, year);

      const customerAddress =
        quotation.customer.shippingAddress ||
        quotation.customer.billingAddress ||
        "Default Customer Delivery Address";

      createdFulfillmentOrder = await tx.fulfillmentOrder.create({
        data: {
          fulfillmentNumber,
          quotationId: quotation.id,
          organizationId: orgId,
          status: FulfillmentStatus.PENDING,
          shippingAddress: customerAddress,
          notes: `Fulfillment initialized from confirmed quotation ${quotation.quoteNumber}.`,
        },
      });
    } else {
      createdFulfillmentOrder = existingFul;
    }
  }

  // Log confirmation audit
  const effectiveActorId = actorId || quotation.salesRep.userId;
  await tx.approvalAuditLog.create({
    data: {
      quotationId: quotation.id,
      organizationId: orgId,
      actorId: effectiveActorId,
      actorRole,
      action: "DEAL_CONFIRMED",
      reason: `Quotation ${quotation.quoteNumber} confirmed and signed. Invoices, subscriptions, and fulfillment generated.`,
      metadata: {
        quoteNumber: quotation.quoteNumber,
        grandTotal: quotation.grandTotal,
        invoicesGenerated: createdInvoices.map((i) => i.invoiceNumber),
        subscriptionsGenerated: createdSubscriptions.map((s) => s.subscriptionNumber),
        fulfillmentGenerated: createdFulfillmentOrder?.fulfillmentNumber || null,
      },
    },
  });

  return {
    quotation: updatedQuotation,
    invoices: createdInvoices,
    subscriptions: createdSubscriptions,
    fulfillmentOrder: createdFulfillmentOrder,
  };
}
