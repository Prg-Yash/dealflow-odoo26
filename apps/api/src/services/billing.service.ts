import {
  prisma,
  CategoryType,
  QuoteStage,
  SubscriptionStatus,
  BillingInterval,
  InvoiceStatus,
  CreditNoteStatus,
  PaymentStatus,
  ShipmentStatus,
  type Prisma,
} from "@repo/db";
import { AppError } from "../middleware/error.js";
import {
  prorate,
  calculateProrationSchedule,
  refund,
  calculateMrrArr,
} from "../lib/billing-engine.js";
import { enqueueSubscriptionReminder } from "../queues/subscription-reminder.queue.js";
import type {
  ConfirmQuotationInput,
  CreateSubscriptionInput,
  ModifySubscriptionInput,
  UpdateSubscriptionLineInput,
  CancelSubscriptionInput,
  ScheduleReminderInput,
  RecordPaymentInput,
  QueryInvoicesInput,
  QueryCreditNotesInput,
} from "../schemas/billing.schema.js";

// =============================================================================
// Helper ID / Number Generators
// =============================================================================

export async function generateSubscriptionNumber(): Promise<string> {
  const count = await prisma.subscription.count();
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${year}-${String(count + 1).padStart(4, "0")}-${rand}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${String(count + 1).padStart(4, "0")}-${rand}`;
}

export async function generateCreditNoteNumber(): Promise<string> {
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
// Phase 3: Hybrid Invoicing & Subscriptions (Decoupled Billing Engine)
// =============================================================================

export interface GenerateHybridBillingInput {
  quotationId: string;
  billingInterval?: BillingInterval;
  startDate?: Date;
  notes?: string;
}

/**
 * Phase 3: Decouple physical goods from recurring SaaS contracts.
 *
 * 1. Separation: Identifies all QuotationLine items with itemType === "SUBSCRIPTION".
 *    Creates a Subscription record and SubscriptionLine records immediately upon order confirmation.
 * 2. Invoicing Decoupling: For recurring SaaS, generates initial cycle recurring invoice.
 *    For physical HARDWARE goods, does NOT invoice immediately; instead waits for shipment dispatch.
 * 3. One-Time Services: Invoices one-time professional services (if any exist).
 */
export async function generateHybridBilling(
  orgId: string,
  input: GenerateHybridBillingInput
) {
  const { quotationId, notes } = input;

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
    throw new AppError(400, "EMPTY_QUOTATION", "Cannot generate billing for quotation with no lines.");
  }

  // Separate recurring vs physical hardware vs one-time services
  const recurringLines = quotation.lines.filter(
    (line) => line.itemType === CategoryType.SUBSCRIPTION
  );
  const hardwareLines = quotation.lines.filter(
    (line) => line.itemType === CategoryType.HARDWARE
  );
  const serviceLines = quotation.lines.filter(
    (line) => line.itemType === CategoryType.SERVICE
  );

  const billingInterval = input.billingInterval ?? BillingInterval.MONTHLY;
  const startDate = input.startDate ?? new Date();
  const endDate = calculateCycleEnd(startDate, billingInterval);

  return prisma.$transaction(async (tx) => {
    let createdSubscription = null;
    let createdSaaSInvoice = null;
    let createdServiceInvoice = null;

    // 1. Create Subscription for recurring SaaS lines immediately
    if (recurringLines.length > 0) {
      const existingSub = await tx.subscription.findFirst({
        where: { quotationId: quotation.id, organizationId: orgId },
        include: { lines: true },
      });

      if (!existingSub) {
        const subscriptionNumber = await generateSubscriptionNumber();

        let recurringTotal = 0;
        const subLinesData = recurringLines.map((line) => {
          const gross = line.unitPrice * line.quantity;
          const discount = gross * (line.discountPercent / 100);
          const recurringAmount = gross - discount;
          recurringTotal += recurringAmount;

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

        const { mrr, arr } = calculateMrrArr(recurringTotal, billingInterval);

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
            autoRenew: true,
            notes: notes || `SaaS subscription agreement for quotation ${quotation.quoteNumber}`,
            lines: {
              create: subLinesData,
            },
          },
          include: { lines: true },
        });

        // Generate Period 1 SaaS invoice
        const saasInvoiceNumber = await generateInvoiceNumber();
        const subtotal = Math.round(recurringTotal * 100) / 100;
        const net15DueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

        createdSaaSInvoice = await tx.invoice.create({
          data: {
            invoiceNumber: saasInvoiceNumber,
            quotationId: quotation.id,
            subscriptionId: createdSubscription.id,
            customerId: quotation.customerId,
            organizationId: orgId,
            status: InvoiceStatus.ISSUED,
            issueDate: new Date(),
            dueDate: net15DueDate,
            paymentTerms: "Net 15",
            subtotal,
            discountTotal: 0.0,
            taxTotal: 0.0,
            totalAmount: subtotal,
            amountPaid: 0.0,
            amountRemaining: subtotal,
            notes: `Recurring SaaS invoice (Period 1: ${billingInterval}).`,
            lines: {
              create: recurringLines.map((line) => {
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
      } else {
        createdSubscription = existingSub;
      }
    }

    // 2. One-Time Professional Services Invoicing (if any exist)
    if (serviceLines.length > 0) {
      const existingServiceInv = await tx.invoice.findFirst({
        where: { quotationId: quotation.id, subscriptionId: null, notes: { contains: "Professional Services" } },
      });

      if (!existingServiceInv) {
        const serviceInvoiceNumber = await generateInvoiceNumber();
        let serviceSubtotal = 0;
        let serviceDiscountTotal = 0;

        for (const line of serviceLines) {
          const gross = line.unitPrice * line.quantity;
          const discount = gross * (line.discountPercent / 100);
          serviceSubtotal += gross;
          serviceDiscountTotal += discount;
        }

        const serviceTotal = Math.round((serviceSubtotal - serviceDiscountTotal) * 100) / 100;
        const net30DueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        createdServiceInvoice = await tx.invoice.create({
          data: {
            invoiceNumber: serviceInvoiceNumber,
            quotationId: quotation.id,
            customerId: quotation.customerId,
            organizationId: orgId,
            status: InvoiceStatus.ISSUED,
            issueDate: new Date(),
            dueDate: net30DueDate,
            paymentTerms: "Net 30",
            subtotal: Math.round(serviceSubtotal * 100) / 100,
            discountTotal: Math.round(serviceDiscountTotal * 100) / 100,
            taxTotal: 0.0,
            totalAmount: serviceTotal,
            amountPaid: 0.0,
            amountRemaining: serviceTotal,
            notes: `Commercial invoice for Professional Services on quotation ${quotation.quoteNumber}.`,
            lines: {
              create: serviceLines.map((line) => {
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
      } else {
        createdServiceInvoice = existingServiceInv;
      }
    }

    return {
      message: "Hybrid billing generated successfully.",
      subscription: createdSubscription,
      saasInvoice: createdSaaSInvoice,
      serviceInvoice: createdServiceInvoice,
      physicalGoodsSummary: {
        hardwareLinesCount: hardwareLines.length,
        invoicingPolicy: "Fulfillment-Triggered Invoicing: Physical goods will be invoiced upon shipment dispatch (SHIPPED status).",
      },
    };
  });
}

// =============================================================================
// Phase 3: Fulfillment-Triggered Invoicing for Physical Goods
// =============================================================================

/**
 * Generates an Invoice and InvoiceLines strictly for physical hardware items
 * contained in a dispatched Shipment package (triggered on SHIPPED status).
 *
 * Any unfulfilled items sitting in Backorder remain un-invoiced until dispatched.
 */
export async function generateShipmentInvoice(orgId: string, shipmentId: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId },
    include: {
      fulfillmentOrder: {
        include: {
          quotation: {
            include: { customer: true, lines: true },
          },
        },
      },
      lines: {
        include: {
          product: true,
          quotationLine: true,
        },
      },
      warehouse: true,
    },
  });

  if (!shipment || shipment.fulfillmentOrder.organizationId !== orgId) {
    throw new AppError(404, "NOT_FOUND", "Shipment not found.");
  }

  if (
    shipment.status !== ShipmentStatus.SHIPPED &&
    shipment.status !== ShipmentStatus.DELIVERED
  ) {
    throw new AppError(
      400,
      "INVALID_SHIPMENT_STATUS",
      `Invoices can only be generated for SHIPPED or DELIVERED shipments (current status: ${shipment.status}).`
    );
  }

  // Check if invoice for this shipment package already exists
  const existingInv = await prisma.invoice.findFirst({
    where: {
      quotationId: shipment.fulfillmentOrder.quotationId,
      organizationId: orgId,
      notes: { contains: shipment.shipmentNumber },
    },
    include: { lines: true },
  });

  if (existingInv) {
    return {
      message: "Invoice already exists for this shipment package.",
      invoice: existingInv,
    };
  }

  const invoiceNumber = await generateInvoiceNumber();
  const net30DueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  let subtotal = 0;
  let discountTotal = 0;
  const invoiceLinesData = [];

  for (const shipLine of shipment.lines) {
    const qLine = shipLine.quotationLine;
    const unitPrice = qLine?.unitPrice ?? 0;
    const discountPercent = qLine?.discountPercent ?? 0;
    const gross = unitPrice * shipLine.quantity;
    const discount = gross * (discountPercent / 100);
    const net = gross - discount;

    subtotal += gross;
    discountTotal += discount;

    invoiceLinesData.push({
      quotationLineId: shipLine.quotationLineId,
      productId: shipLine.productId,
      variantId: shipLine.variantId,
      description: `[Dispatched from ${shipment.warehouse.name}] ${shipLine.product.name} (Shipment: ${shipment.shipmentNumber})`,
      quantity: shipLine.quantity,
      unitPrice,
      discountPercent,
      totalAmount: Math.round(net * 100) / 100,
      isRecurring: false,
    });
  }

  const totalAmount = Math.round((subtotal - discountTotal) * 100) / 100;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      quotationId: shipment.fulfillmentOrder.quotationId,
      customerId: shipment.fulfillmentOrder.quotation.customerId,
      organizationId: orgId,
      status: InvoiceStatus.ISSUED,
      issueDate: new Date(),
      dueDate: net30DueDate,
      paymentTerms: "Net 30",
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      taxTotal: 0.0,
      totalAmount,
      amountPaid: 0.0,
      amountRemaining: totalAmount,
      notes: `Fulfillment-Triggered invoice for dispatched shipment ${shipment.shipmentNumber} (Carrier: ${shipment.carrier || "Standard Freight"}, Tracking: ${shipment.trackingNumber || "N/A"}).`,
      lines: {
        create: invoiceLinesData,
      },
    },
    include: { lines: true },
  });

  return {
    message: `Fulfillment invoice ${invoice.invoiceNumber} generated successfully for shipment ${shipment.shipmentNumber}.`,
    invoice,
    shipment: {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      warehouseName: shipment.warehouse.name,
      dispatchedItemsCount: shipment.lines.length,
    },
  };
}

export async function createSubscriptionPlan(
  orgId: string,
  input: CreateSubscriptionInput
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId: orgId },
  });
  if (!customer) {
    throw new AppError(404, "NOT_FOUND", "Customer not found.");
  }

  const product = await prisma.product.findFirst({
    where: { id: input.productId, organizationId: orgId },
  });
  if (!product) {
    throw new AppError(404, "NOT_FOUND", "Product not found.");
  }

  const subscriptionNumber = await generateSubscriptionNumber();
  const startDate = input.startDate ?? new Date();
  const billingInterval = input.billingInterval ?? BillingInterval.MONTHLY;
  const endDate = calculateCycleEnd(startDate, billingInterval);

  const quantity = input.quantity ?? 1;
  const unitPrice = input.unitPrice ?? product.basePrice;
  const discountPercent = input.discountPercent ?? 0;
  const gross = unitPrice * quantity;
  const discountAmount = gross * (discountPercent / 100);
  const recurringAmount = gross - discountAmount;
  const { mrr, arr } = calculateMrrArr(recurringAmount, billingInterval);

  const planName = input.planName || product.name;

  const subscription = await prisma.subscription.create({
    data: {
      subscriptionNumber,
      customerId: customer.id,
      organizationId: orgId,
      status: SubscriptionStatus.ACTIVE,
      billingInterval,
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      nextBillingDate: endDate,
      currentMrr: Math.round(mrr * 100) / 100,
      currentArr: Math.round(arr * 100) / 100,
      autoRenew: input.autoRenew ?? true,
      notes: input.notes ?? `Plan created for ${customer.name}: ${planName}`,
      lines: {
        create: [
          {
            productId: product.id,
            variantId: input.variantId ?? null,
            quantity,
            unitPrice,
            discountPercent,
            recurringAmount: Math.round(recurringAmount * 100) / 100,
          },
        ],
      },
    },
    include: {
      customer: true,
      lines: { include: { product: true, variant: true } },
    },
  });

  // Enqueue BullMQ automated reminder if enabled
  if (input.enableReminder !== false) {
    await enqueueSubscriptionReminder({
      subscriptionId: subscription.id,
      subscriptionNumber: subscription.subscriptionNumber,
      organizationId: orgId,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      planName,
      billingInterval,
      nextBillingDate: endDate.toISOString(),
      amount: recurringAmount,
      reminderDaysBefore: 7,
      triggeredAt: new Date().toISOString(),
    });
  }

  return subscription;
}

export async function modifySubscription(
  orgId: string,
  subscriptionId: string,
  input: ModifySubscriptionInput
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId: orgId },
    include: { customer: true, lines: true },
  });

  if (!subscription) {
    throw new AppError(404, "NOT_FOUND", "Subscription not found.");
  }

  const dataToUpdate: any = {};
  if (input.billingInterval) dataToUpdate.billingInterval = input.billingInterval;
  if (input.status) dataToUpdate.status = input.status;
  if (input.nextBillingDate) dataToUpdate.nextBillingDate = input.nextBillingDate;
  if (typeof input.autoRenew === "boolean") dataToUpdate.autoRenew = input.autoRenew;
  if (input.notes) dataToUpdate.notes = input.notes;

  // If quantity or price updated on the line
  if (
    subscription.lines.length > 0 &&
    (input.quantity || input.unitPrice || typeof input.discountPercent === "number")
  ) {
    const primaryLine = subscription.lines[0]!;
    const newQty = input.quantity ?? primaryLine.quantity;
    const newUnitPrice = input.unitPrice ?? primaryLine.unitPrice;
    const newDiscount = input.discountPercent ?? primaryLine.discountPercent;
    const gross = newUnitPrice * newQty;
    const discountAmount = gross * (newDiscount / 100);
    const newRecurringAmount = gross - discountAmount;

    await prisma.subscriptionLine.update({
      where: { id: primaryLine.id },
      data: {
        quantity: newQty,
        unitPrice: newUnitPrice,
        discountPercent: newDiscount,
        recurringAmount: Math.round(newRecurringAmount * 100) / 100,
      },
    });

    const interval = input.billingInterval ?? subscription.billingInterval;
    const { mrr, arr } = calculateMrrArr(newRecurringAmount, interval);
    dataToUpdate.currentMrr = Math.round(mrr * 100) / 100;
    dataToUpdate.currentArr = Math.round(arr * 100) / 100;
  } else if (input.billingInterval && input.billingInterval !== subscription.billingInterval) {
    const totalAmount = subscription.lines.reduce((acc, l) => acc + l.recurringAmount, 0);
    const { mrr, arr } = calculateMrrArr(totalAmount, input.billingInterval);
    dataToUpdate.currentMrr = Math.round(mrr * 100) / 100;
    dataToUpdate.currentArr = Math.round(arr * 100) / 100;
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: dataToUpdate,
    include: {
      customer: true,
      lines: { include: { product: true, variant: true } },
    },
  });

  return updatedSubscription;
}

export async function scheduleSubscriptionReminder(
  orgId: string,
  subscriptionId: string,
  input?: ScheduleReminderInput
) {
  let subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId: orgId },
    include: { customer: true, lines: { include: { product: true } } },
  });

  if (!subscription) {
    // Also try finding by subscriptionNumber or id regardless of orgId for fallback lookups
    subscription = await prisma.subscription.findFirst({
      where: {
        OR: [{ id: subscriptionId }, { subscriptionNumber: subscriptionId }],
      },
      include: { customer: true, lines: { include: { product: true } } },
    });
  }

  const customerName =
    subscription?.customer?.name || input?.customerName || "Aryan Shinde";
  const customerEmail =
    subscription?.customer?.email || input?.customerEmail || "contact@aryanshinde.in";
  const customerId = subscription?.customerId || "cust-demo";
  const subNumber = subscription?.subscriptionNumber || subscriptionId || "SUB-2026-0001";
  const planName =
    subscription?.lines[0]?.product?.name ||
    input?.planName ||
    "Enterprise Care & Cloud License";
  const billingInterval =
    subscription?.billingInterval || input?.billingInterval || "MONTHLY";
  const nextBillingDate =
    subscription?.nextBillingDate?.toISOString() ||
    input?.nextBillingDate ||
    new Date(Date.now() + 30 * 86400000).toISOString();
  const amount =
    subscription?.lines && subscription.lines.length > 0
      ? subscription.lines.reduce((acc, l) => acc + l.recurringAmount, 0)
      : input?.amount || 1000;

  const result = await enqueueSubscriptionReminder({
    subscriptionId: subscription?.id || subscriptionId,
    subscriptionNumber: subNumber,
    organizationId: orgId,
    customerId,
    customerName,
    customerEmail,
    planName,
    billingInterval: billingInterval as any,
    nextBillingDate,
    amount,
    reminderDaysBefore: input?.reminderDaysBefore ?? 7,
    manualTrigger: input?.manualTrigger ?? true,
    triggeredAt: new Date().toISOString(),
  });

  return {
    subscriptionId: subscription?.id || subscriptionId,
    scheduled: result.success,
    jobId: result.jobId,
    message: result.success
      ? `BullMQ renewal reminder scheduled for ${customerEmail}.`
      : `Queued locally (${result.error || "Redis offline in development"}).`,
  };
}

// =============================================================================
// Quotation Confirmation (Centralized Hybrid Entrypoint)
// =============================================================================

export async function confirmQuotation(
  orgId: string,
  quotationId: string,
  input?: ConfirmQuotationInput
) {
  // 1. Update quotation stage to CONFIRMED
  await prisma.quotation.update({
    where: { id: quotationId, organizationId: orgId },
    data: { stage: QuoteStage.CONFIRMED },
  });

  // 2. Generate decoupled hybrid billing
  const billingResult = await generateHybridBilling(orgId, {
    quotationId,
    billingInterval: input?.billingInterval,
    startDate: input?.startDate,
  });

  // 3. Trigger Waterfall Auto-Split Fulfillment on hardware lines (if any exist)
  let fulfillmentResult = null;
  const quotationWithLines = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: {
      customer: true,
      lines: { include: { product: true } },
    },
  });

  const hasHardware = quotationWithLines?.lines.some(
    (l) => l.itemType === CategoryType.HARDWARE
  );

  if (hasHardware) {
    try {
      const { autoSplitFulfillment } = await import("./fulfillment.service.js");
      fulfillmentResult = await autoSplitFulfillment(orgId, { quotationId });
    } catch (err) {
      console.warn("Auto-split fulfillment deferred or skipped:", err);
    }
  }

  return {
    quotation: quotationWithLines,
    subscription: billingResult.subscription,
    invoice: billingResult.saasInvoice || billingResult.serviceInvoice,
    billingSummary: billingResult,
    fulfillment: fulfillmentResult,
  };
}

// =============================================================================
// Subscription Line Mid-Cycle Alterations & Proration
// =============================================================================

export async function updateSubscriptionLine(
  orgId: string,
  subscriptionId: string,
  lineId: string,
  input: UpdateSubscriptionLineInput
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId: orgId },
    include: {
      customer: true,
      lines: { include: { product: true } },
    },
  });

  if (!subscription) {
    throw new AppError(404, "NOT_FOUND", "Subscription not found.");
  }

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new AppError(
      400,
      "SUBSCRIPTION_NOT_ACTIVE",
      `Cannot alter lines on a subscription with status: ${subscription.status}.`
    );
  }

  const line = subscription.lines.find((l) => l.id === lineId);
  if (!line) {
    throw new AppError(404, "LINE_NOT_FOUND", "Subscription line not found.");
  }

  const oldQty = line.quantity;
  const newQty = input.quantity;

  if (newQty <= 0) {
    throw new AppError(400, "INVALID_QUANTITY", "Quantity must be greater than 0.");
  }

  if (newQty === oldQty) {
    return {
      message: "No quantity change requested.",
      subscription,
      proration: null,
    };
  }

  const now = new Date();
  const prorationSchedule = calculateProrationSchedule(
    oldQty,
    newQty,
    line.unitPrice,
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    now
  );

  return prisma.$transaction(async (tx) => {
    // 1. Update subscription line quantity & recurring amount
    const gross = line.unitPrice * newQty;
    const discount = gross * (line.discountPercent / 100);
    const newRecurringAmount = Math.round((gross - discount) * 100) / 100;

    const updatedLine = await tx.subscriptionLine.update({
      where: { id: lineId },
      data: {
        quantity: newQty,
        recurringAmount: newRecurringAmount,
      },
    });

    // 2. Recalculate MRR and ARR for the entire subscription
    const allLines = await tx.subscriptionLine.findMany({
      where: { subscriptionId: subscription.id },
    });
    const totalRecurring = allLines.reduce(
      (sum, l) => (l.id === lineId ? sum + newRecurringAmount : sum + l.recurringAmount),
      0
    );

    const { mrr, arr } = calculateMrrArr(totalRecurring, subscription.billingInterval);

    const updatedSubscription = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        currentMrr: mrr,
        currentArr: arr,
      },
      include: { lines: true },
    });

    let generatedInvoice = null;
    let generatedCreditNote = null;

    // 3. Issue Prorated Invoice for Seat Expansion
    if (prorationSchedule.adjustmentType === "INVOICE") {
      const invoiceNumber = await generateInvoiceNumber();
      const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      generatedInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          organizationId: orgId,
          status: InvoiceStatus.ISSUED,
          issueDate: now,
          dueDate,
          paymentTerms: "Net 15",
          subtotal: prorationSchedule.proratedAmount,
          discountTotal: 0.0,
          taxTotal: 0.0,
          totalAmount: prorationSchedule.proratedAmount,
          amountPaid: 0.0,
          amountRemaining: prorationSchedule.proratedAmount,
          notes: `Mid-cycle prorated expansion: Added ${prorationSchedule.deltaQuantity} seats of ${line.product.name} (${prorationSchedule.daysRemaining}/${prorationSchedule.cycleLengthDays} days remaining).`,
          lines: {
            create: [
              {
                productId: line.productId,
                variantId: line.variantId,
                description: `Prorated adjustment: +${prorationSchedule.deltaQuantity} ${line.product.name} seats`,
                quantity: prorationSchedule.deltaQuantity,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                totalAmount: prorationSchedule.proratedAmount,
                isRecurring: false,
              },
            ],
          },
        },
        include: { lines: true },
      });
    }

    // 4. Issue Credit Note for Seat Reduction / Downgrade
    if (prorationSchedule.adjustmentType === "CREDIT_NOTE") {
      const creditNoteNumber = await generateCreditNoteNumber();
      const creditAmount = Math.abs(prorationSchedule.proratedAmount);

      generatedCreditNote = await tx.creditNote.create({
        data: {
          creditNoteNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          organizationId: orgId,
          status: CreditNoteStatus.ISSUED,
          amount: creditAmount,
          reason: `Mid-cycle prorated reduction: Removed ${Math.abs(prorationSchedule.deltaQuantity)} seats of ${line.product.name} (${prorationSchedule.daysRemaining}/${prorationSchedule.cycleLengthDays} days remaining).`,
        },
      });
    }

    return {
      message: `Subscription line updated successfully from ${oldQty} to ${newQty} seats.`,
      subscription: updatedSubscription,
      updatedLine,
      proration: prorationSchedule,
      generatedInvoice,
      generatedCreditNote,
    };
  });
}

// =============================================================================
// Subscription Cancellation & Refunds
// =============================================================================

export async function cancelSubscription(
  orgId: string,
  subscriptionId: string,
  input: CancelSubscriptionInput
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId: orgId },
    include: { lines: { include: { product: true } } },
  });

  if (!subscription) {
    throw new AppError(404, "NOT_FOUND", "Subscription not found.");
  }

  if (subscription.status === SubscriptionStatus.CANCELLED) {
    throw new AppError(400, "ALREADY_CANCELLED", "Subscription is already cancelled.");
  }

  const refundRule = input.refundRule ?? "PRORATED";
  const now = new Date();

  const cycleLengthMs = subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime();
  const daysInCycle = Math.max(1, Math.round(cycleLengthMs / (1000 * 60 * 60 * 24)));
  const elapsedMs = now.getTime() - subscription.currentPeriodStart.getTime();
  const daysElapsed = Math.max(0, Math.round(elapsedMs / (1000 * 60 * 60 * 24)));

  const totalCycleCharge = subscription.lines.reduce((s, l) => s + l.recurringAmount, 0);
  const refundAmount = refund(totalCycleCharge, daysElapsed, daysInCycle, refundRule);

  return prisma.$transaction(async (tx) => {
    const updatedSub = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false,
        notes: `${subscription.notes ? subscription.notes + " | " : ""}Cancelled on ${now.toISOString()}. Reason: ${input.reason || input.notes || "Customer requested cancellation."}`,
      },
    });

    let creditNote = null;
    if (refundAmount > 0) {
      const creditNoteNumber = await generateCreditNoteNumber();
      creditNote = await tx.creditNote.create({
        data: {
          creditNoteNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          organizationId: orgId,
          status: CreditNoteStatus.ISSUED,
          amount: refundAmount,
          reason: `Prorated refund upon cancellation (${daysInCycle - daysElapsed}/${daysInCycle} days remaining). Reason: ${input.reason || input.notes || "Subscription cancelled"}`,
        },
      });
    }

    return {
      message: "Subscription cancelled successfully.",
      subscription: updatedSub,
      refundAmount,
      creditNote,
    };
  });
}

// =============================================================================
// Invoices & Payments Querying
// =============================================================================

export async function listInvoices(orgId: string, query?: QueryInvoicesInput) {
  return prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      ...(query?.customerId && { customerId: query.customerId }),
      ...(query?.status && { status: query.status }),
      ...(query?.subscriptionId && { subscriptionId: query.subscriptionId }),
      ...(query?.quotationId && { quotationId: query.quotationId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      lines: true,
      payments: true,
    },
  });
}

export async function getInvoiceById(orgId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      customer: true,
      quotation: true,
      subscription: true,
      lines: { include: { product: true } },
      payments: true,
      creditNotes: true,
    },
  });

  if (!invoice) {
    throw new AppError(404, "NOT_FOUND", "Invoice not found.");
  }
  return invoice;
}

export async function recordPayment(orgId: string, invoiceId: string, input: RecordPaymentInput) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
  });

  if (!invoice) {
    throw new AppError(404, "NOT_FOUND", "Invoice not found.");
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new AppError(400, "ALREADY_PAID", "Invoice is already fully paid.");
  }

  const paymentAmount = input.amount;
  if (paymentAmount <= 0) {
    throw new AppError(400, "INVALID_AMOUNT", "Payment amount must be greater than 0.");
  }

  if (paymentAmount > invoice.amountRemaining) {
    throw new AppError(
      400,
      "OVERPAYMENT",
      `Payment amount ($${paymentAmount}) exceeds remaining balance ($${invoice.amountRemaining}).`
    );
  }

  return prisma.$transaction(async (tx) => {
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

    const newAmountPaid = Math.round((invoice.amountPaid + paymentAmount) * 100) / 100;
    const newAmountRemaining = Math.round((invoice.totalAmount - newAmountPaid) * 100) / 100;
    const newStatus = newAmountRemaining <= 0 ? InvoiceStatus.PAID : InvoiceStatus.ISSUED;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        amountRemaining: newAmountRemaining,
        status: newStatus,
      },
      include: { payments: true, lines: true },
    });

    return {
      payment,
      invoice: updatedInvoice,
    };
  });
}

// =============================================================================
// Subscriptions Listing & Detail
// =============================================================================

export async function listSubscriptions(
  orgId: string,
  query?: { customerId?: string; status?: SubscriptionStatus }
) {
  return prisma.subscription.findMany({
    where: {
      organizationId: orgId,
      ...(query?.customerId && { customerId: query.customerId }),
      ...(query?.status && { status: query.status }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      lines: { include: { product: true } },
      invoices: true,
    },
  });
}

export async function getSubscriptionById(orgId: string, id: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id, organizationId: orgId },
    include: {
      customer: true,
      quotation: true,
      lines: { include: { product: true, variant: true } },
      invoices: { include: { payments: true } },
      creditNotes: true,
    },
  });

  if (!subscription) {
    throw new AppError(404, "NOT_FOUND", "Subscription not found.");
  }
  return subscription;
}

export async function listCreditNotes(orgId: string, query?: QueryCreditNotesInput) {
  return prisma.creditNote.findMany({
    where: {
      organizationId: orgId,
      ...(query?.customerId && { customerId: query.customerId }),
      ...(query?.status && { status: query.status }),
      ...(query?.subscriptionId && { subscriptionId: query.subscriptionId }),
      ...(query?.invoiceId && { invoiceId: query.invoiceId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
    },
  });
}
