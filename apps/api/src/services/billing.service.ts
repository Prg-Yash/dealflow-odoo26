import {
  prisma,
  CategoryType,
  QuoteStage,
  SubscriptionStatus,
  BillingInterval,
  InvoiceStatus,
  CreditNoteStatus,
  PaymentStatus,
  UserRole,
} from "@repo/db";
import { AppError } from "../middleware/error.js";
import { prorate, refund, calculateMrrArr } from "../lib/billing-engine.js";
import type {
  ConfirmQuotationInput,
  UpdateSubscriptionLineInput,
  CancelSubscriptionInput,
  RecordPaymentInput,
  QueryInvoicesInput,
  QueryCreditNotesInput,
} from "../schemas/billing.schema.js";

// =============================================================================
// Helper ID / Number Generators
// =============================================================================

async function generateSubscriptionNumber(): Promise<string> {
  const count = await prisma.subscription.count();
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${year}-${String(count + 1).padStart(4, "0")}-${rand}`;
}

async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${String(count + 1).padStart(4, "0")}-${rand}`;
}

async function generateCreditNoteNumber(): Promise<string> {
  const count = await prisma.creditNote.count();
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CN-${year}-${String(count + 1).padStart(4, "0")}-${rand}`;
}

function calculateCycleEnd(start: Date, interval: BillingInterval): Date {
  const end = new Date(start.getTime());
  switch (interval) {
    case BillingInterval.MONTHLY:
      end.setDate(end.getDate() + 30);
      break;
    case BillingInterval.QUARTERLY:
      end.setDate(end.getDate() + 90);
      break;
    case BillingInterval.ANNUALLY:
      end.setDate(end.getDate() + 365);
      break;
  }
  return end;
}

// =============================================================================
// Quotation Confirmation & Hybrid Invoicing
// =============================================================================

export async function confirmQuotation(
  orgId: string,
  quotationId: string,
  input?: ConfirmQuotationInput
) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: {
      customer: true,
      lines: {
        include: { product: true, variant: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  if (quotation.lines.length === 0) {
    throw new AppError(400, "EMPTY_QUOTATION", "Cannot confirm quotation with no lines.");
  }

  // Allow confirmation from valid active stages
  if (quotation.stage === QuoteStage.CANCELLED) {
    throw new AppError(400, "INVALID_STAGE", "Cannot confirm a cancelled quotation.");
  }

  // Idempotency check: if already confirmed, check existing records
  if (quotation.stage === QuoteStage.CONFIRMED) {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { quotationId, organizationId: orgId },
      include: { lines: true },
    });
    const existingInvoice = await prisma.invoice.findFirst({
      where: { quotationId, organizationId: orgId },
      include: { lines: true },
    });
    if (existingSubscription || existingInvoice) {
      return {
        quotation,
        subscription: existingSubscription,
        invoice: existingInvoice,
      };
    }
  }

  // Separate recurring vs one-time lines
  const recurringLines = quotation.lines.filter(
    (line) => line.itemType === CategoryType.SUBSCRIPTION
  );
  const oneTimeLines = quotation.lines.filter(
    (line) =>
      line.itemType === CategoryType.HARDWARE ||
      line.itemType === CategoryType.SERVICE
  );

  const billingInterval = input?.billingInterval ?? BillingInterval.MONTHLY;
  const startDate = input?.startDate ?? new Date();
  const endDate = calculateCycleEnd(startDate, billingInterval);

  let subscriptionNumber = "";
  if (recurringLines.length > 0) {
    subscriptionNumber = await generateSubscriptionNumber();
  }

  let invoiceNumber = "";
  if (oneTimeLines.length > 0) {
    invoiceNumber = await generateInvoiceNumber();
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update quotation to CONFIRMED
    const updatedQuotation = await tx.quotation.update({
      where: { id: quotationId },
      data: { stage: QuoteStage.CONFIRMED },
    });

    let createdSubscription = null;
    let createdInvoice = null;

    // 2. Create Subscription for recurring lines
    if (recurringLines.length > 0) {
      const totalRecurringAmount = recurringLines.reduce(
        (sum, line) => sum + line.netPrice,
        0
      );
      const { mrr, arr } = calculateMrrArr(totalRecurringAmount, billingInterval);

      createdSubscription = await tx.subscription.create({
        data: {
          subscriptionNumber,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          organizationId: orgId,
          status: SubscriptionStatus.ACTIVE,
          billingInterval,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          nextBillingDate: endDate,
          currentMrr: mrr,
          currentArr: arr,
          notes: input?.notes ?? `Created from Quotation ${quotation.quoteNumber}`,
          lines: {
            create: recurringLines.map((line) => ({
              quotationLineId: line.id,
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent,
              recurringAmount: line.netPrice,
            })),
          },
        },
        include: {
          lines: { include: { product: true, variant: true } },
          customer: true,
        },
      });
    }

    // 3. Create Invoice for one-time lines
    if (oneTimeLines.length > 0) {
      const subtotal = oneTimeLines.reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0
      );
      const discountTotal = oneTimeLines.reduce(
        (sum, line) => sum + line.discountAmount,
        0
      );
      const totalAmount = oneTimeLines.reduce((sum, line) => sum + line.netPrice, 0);

      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime());
      dueDate.setDate(dueDate.getDate() + 30);

      createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          organizationId: orgId,
          status: InvoiceStatus.ISSUED,
          issueDate,
          dueDate,
          paymentTerms: input?.paymentTerms ?? "Net 30",
          subtotal: Math.round(subtotal * 100) / 100,
          discountTotal: Math.round(discountTotal * 100) / 100,
          taxTotal: 0,
          totalAmount: Math.round(totalAmount * 100) / 100,
          amountPaid: 0,
          amountRemaining: Math.round(totalAmount * 100) / 100,
          notes: `One-time invoice for Quotation ${quotation.quoteNumber}`,
          lines: {
            create: oneTimeLines.map((line) => ({
              quotationLineId: line.id,
              productId: line.productId,
              variantId: line.variantId,
              description:
                line.description || line.product.name || "One-time item",
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent,
              totalAmount: line.netPrice,
              isRecurring: false,
            })),
          },
        },
        include: {
          lines: { include: { product: true, variant: true } },
          customer: true,
        },
      });
    }

    return {
      quotation: updatedQuotation,
      subscription: createdSubscription,
      invoice: createdInvoice,
    };
  });
}

// =============================================================================
// Subscription Management & Proration
// =============================================================================

export async function getSubscriptionById(orgId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId: orgId },
    include: {
      customer: true,
      lines: {
        include: { product: true, variant: true },
      },
      invoices: {
        include: { lines: true, payments: true },
        orderBy: { createdAt: "desc" },
      },
      creditNotes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!subscription) {
    throw new AppError(404, "NOT_FOUND", "Subscription not found.");
  }

  return subscription;
}

export async function listSubscriptions(
  orgId: string,
  query?: {
    customerId?: string;
    status?: SubscriptionStatus;
    page?: number;
    limit?: number;
  }
) {
  const page = query?.page ?? 1;
  const limit = query?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: any = { organizationId: orgId };
  if (query?.customerId) where.customerId = query.customerId;
  if (query?.status) where.status = query.status;

  const [total, subscriptions] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    subscriptions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateSubscriptionLineQuantity(
  orgId: string,
  subscriptionId: string,
  lineId: string,
  input: UpdateSubscriptionLineInput
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId: orgId },
    include: {
      lines: true,
    },
  });

  if (!subscription) {
    throw new AppError(404, "NOT_FOUND", "Subscription not found.");
  }

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new AppError(
      400,
      "INVALID_STATUS",
      `Cannot modify subscription with status ${subscription.status}.`
    );
  }

  const line = subscription.lines.find((l) => l.id === lineId);
  if (!line) {
    throw new AppError(404, "NOT_FOUND", "Subscription line not found.");
  }

  const oldQty = line.quantity;
  const newQty = input.quantity;

  if (oldQty === newQty) {
    return {
      subscription,
      updatedLine: line,
      proratedDelta: 0,
      adjustmentInvoice: null,
      creditNote: null,
    };
  }

  // Cycle details
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;
  const cycleLengthDays = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  const asOf = input.asOfDate ?? new Date();
  const daysElapsed = Math.max(
    0,
    Math.round((asOf.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  const effectiveUnitPrice =
    line.unitPrice * (1 - line.discountPercent / 100);

  const proratedDelta = prorate(
    oldQty,
    newQty,
    effectiveUnitPrice,
    cycleLengthDays,
    daysElapsed
  );

  let newInvoiceNumber = "";
  if (newQty > oldQty && proratedDelta > 0) {
    newInvoiceNumber = await generateInvoiceNumber();
  }

  let newCreditNoteNumber = "";
  if (newQty < oldQty && proratedDelta < 0) {
    newCreditNoteNumber = await generateCreditNoteNumber();
  }

  return prisma.$transaction(async (tx) => {
    let adjustmentInvoice = null;
    let creditNote = null;

    // A quantity increase creates an immediate InvoiceLine/adjustment for the prorated delta
    if (newQty > oldQty && proratedDelta > 0) {
      adjustmentInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: newInvoiceNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          organizationId: orgId,
          status: InvoiceStatus.ISSUED,
          issueDate: asOf,
          dueDate: asOf,
          paymentTerms: "Due on Receipt",
          subtotal: proratedDelta,
          discountTotal: 0,
          taxTotal: 0,
          totalAmount: proratedDelta,
          amountPaid: 0,
          amountRemaining: proratedDelta,
          notes: `Prorated adjustment: +${newQty - oldQty} seats (${cycleLengthDays - daysElapsed}/${cycleLengthDays} days remaining)`,
          lines: {
            create: [
              {
                productId: line.productId,
                variantId: line.variantId,
                description: `Prorated seat expansion (+${newQty - oldQty} seats, ${cycleLengthDays - daysElapsed}/${cycleLengthDays} days remaining)`,
                quantity: newQty - oldQty,
                unitPrice: Math.round((proratedDelta / (newQty - oldQty)) * 100) / 100,
                discountPercent: 0,
                totalAmount: proratedDelta,
                isRecurring: true,
              },
            ],
          },
        },
        include: { lines: true },
      });
    }

    // A quantity decrease creates a CreditNote via the unusedDays formula
    if (newQty < oldQty && proratedDelta < 0) {
      const creditAmount = Math.abs(proratedDelta);
      creditNote = await tx.creditNote.create({
        data: {
          creditNoteNumber: newCreditNoteNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          organizationId: orgId,
          amount: creditAmount,
          reason: `Mid-cycle seat reduction proration: ${oldQty} -> ${newQty} seats (${cycleLengthDays - daysElapsed}/${cycleLengthDays} days remaining)`,
          status: CreditNoteStatus.ISSUED,
        },
      });
    }

    // Update the subscription line
    const updatedLineRecurringAmount = Math.round(
      effectiveUnitPrice * newQty * 100
    ) / 100;

    const updatedLine = await tx.subscriptionLine.update({
      where: { id: lineId },
      data: {
        quantity: newQty,
        recurringAmount: updatedLineRecurringAmount,
      },
    });

    // Recompute subscription total recurring amount, MRR, ARR
    const allLines = subscription.lines.map((l) =>
      l.id === lineId ? { ...l, recurringAmount: updatedLineRecurringAmount } : l
    );
    const newTotalRecurring = allLines.reduce(
      (sum, l) => sum + l.recurringAmount,
      0
    );
    const { mrr, arr } = calculateMrrArr(
      newTotalRecurring,
      subscription.billingInterval
    );

    const updatedSubscription = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentMrr: mrr,
        currentArr: arr,
      },
      include: {
        lines: { include: { product: true } },
        customer: true,
        invoices: true,
        creditNotes: true,
      },
    });

    return {
      subscription: updatedSubscription,
      updatedLine,
      proratedDelta,
      adjustmentInvoice,
      creditNote,
    };
  });
}

export async function cancelSubscription(
  orgId: string,
  subscriptionId: string,
  input?: CancelSubscriptionInput
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId: orgId },
    include: { lines: true },
  });

  if (!subscription) {
    throw new AppError(404, "NOT_FOUND", "Subscription not found.");
  }

  if (subscription.status === SubscriptionStatus.CANCELLED) {
    throw new AppError(400, "ALREADY_CANCELLED", "Subscription is already cancelled.");
  }

  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;
  const cycleLengthDays = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  const asOf = input?.asOfDate ?? new Date();
  const daysElapsed = Math.max(
    0,
    Math.round((asOf.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  const totalCyclePaid = subscription.lines.reduce(
    (sum, l) => sum + l.recurringAmount,
    0
  );

  const refundRule = input?.refundRule ?? "PRORATED";
  const refundAmount = refund(totalCyclePaid, daysElapsed, cycleLengthDays, refundRule);

  let creditNoteNumber = "";
  if (refundAmount > 0) {
    creditNoteNumber = await generateCreditNoteNumber();
  }

  return prisma.$transaction(async (tx) => {
    let creditNote = null;

    if (refundAmount > 0) {
      creditNote = await tx.creditNote.create({
        data: {
          creditNoteNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          organizationId: orgId,
          amount: refundAmount,
          reason: `Subscription cancellation refund: ${cycleLengthDays - daysElapsed}/${cycleLengthDays} days unused (${refundRule})`,
          status: CreditNoteStatus.ISSUED,
        },
      });
    }

    const updatedSubscription = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        currentMrr: 0,
        currentArr: 0,
        notes: [
          subscription.notes,
          `Cancelled on ${asOf.toISOString()}`,
          input?.notes,
        ]
          .filter(Boolean)
          .join(" | "),
      },
      include: {
        lines: true,
        creditNotes: true,
      },
    });

    return {
      subscription: updatedSubscription,
      creditNote,
      refundAmount,
    };
  });
}

// =============================================================================
// Invoices CRUD & Settlements
// =============================================================================

export async function listInvoices(
  orgId: string,
  query: QueryInvoicesInput,
  userRole?: UserRole,
  customerProfileId?: string
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: any = { organizationId: orgId };

  // Customer portal constraint: can only see own invoices
  if (userRole === UserRole.CUSTOMER) {
    if (!customerProfileId) {
      throw new AppError(403, "FORBIDDEN", "Customer profile not linked.");
    }
    where.customerId = customerProfileId;
  } else if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.subscriptionId) where.subscriptionId = query.subscriptionId;
  if (query.status) where.status = query.status;

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        lines: { include: { product: true } },
        payments: true,
        creditNotes: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    invoices,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getInvoiceById(
  orgId: string,
  invoiceId: string,
  userRole?: UserRole,
  customerProfileId?: string
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    include: {
      customer: true,
      lines: { include: { product: true, variant: true } },
      payments: { orderBy: { paidAt: "desc" } },
      creditNotes: true,
      subscription: true,
      quotation: true,
    },
  });

  if (!invoice) {
    throw new AppError(404, "NOT_FOUND", "Invoice not found.");
  }

  if (userRole === UserRole.CUSTOMER && invoice.customerId !== customerProfileId) {
    throw new AppError(403, "FORBIDDEN", "You can only view your own organization's invoices.");
  }

  return invoice;
}

export async function recordPayment(
  orgId: string,
  invoiceId: string,
  input: RecordPaymentInput
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
  });

  if (!invoice) {
    throw new AppError(404, "NOT_FOUND", "Invoice not found.");
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new AppError(400, "ALREADY_PAID", "Invoice has already been fully settled.");
  }

  if (invoice.status === InvoiceStatus.VOID) {
    throw new AppError(400, "INVOICE_VOID", "Cannot record payment on a void invoice.");
  }

  const paymentAmount = input.amount;

  return prisma.$transaction(async (tx) => {
    // 1. Create Payment
    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentMethod: input.paymentMethod,
        transactionReference: input.transactionReference,
        status: PaymentStatus.COMPLETED,
        paidAt: input.paidAt ?? new Date(),
        notes: input.notes,
      },
    });

    // 2. Compute updated balances
    const newAmountPaid = Math.round((invoice.amountPaid + paymentAmount) * 100) / 100;
    const newAmountRemaining = Math.max(
      0,
      Math.round((invoice.amountRemaining - paymentAmount) * 100) / 100
    );
    const newStatus =
      newAmountRemaining <= 0 ? InvoiceStatus.PAID : invoice.status;

    // 3. Update Invoice
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        amountRemaining: newAmountRemaining,
        status: newStatus,
      },
      include: {
        lines: true,
        payments: true,
        customer: true,
      },
    });

    return {
      payment,
      invoice: updatedInvoice,
    };
  });
}

// =============================================================================
// Credit Notes Listing
// =============================================================================

export async function listCreditNotes(
  orgId: string,
  query: QueryCreditNotesInput,
  userRole?: UserRole,
  customerProfileId?: string
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: any = { organizationId: orgId };

  if (userRole === UserRole.CUSTOMER) {
    if (!customerProfileId) {
      throw new AppError(403, "FORBIDDEN", "Customer profile not linked.");
    }
    where.customerId = customerProfileId;
  } else if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.subscriptionId) where.subscriptionId = query.subscriptionId;
  if (query.invoiceId) where.invoiceId = query.invoiceId;
  if (query.status) where.status = query.status;

  const [total, creditNotes] = await Promise.all([
    prisma.creditNote.count({ where }),
    prisma.creditNote.findMany({
      where,
      include: {
        customer: true,
        subscription: true,
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    creditNotes,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
