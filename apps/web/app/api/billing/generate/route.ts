import { NextResponse } from "next/server";
import {
  prisma,
  CategoryType,
  SubscriptionStatus,
  BillingInterval,
  InvoiceStatus,
} from "@repo/db";

function calculateMrrArr(recurringTotal: number, interval: BillingInterval) {
  const rounded = Math.round(recurringTotal * 100) / 100;
  switch (interval) {
    case BillingInterval.MONTHLY:
      return { mrr: rounded, arr: Math.round(rounded * 12 * 100) / 100 };
    case BillingInterval.QUARTERLY:
      return { mrr: Math.round((rounded / 3) * 100) / 100, arr: Math.round(rounded * 4 * 100) / 100 };
    case BillingInterval.ANNUALLY:
      return { mrr: Math.round((rounded / 12) * 100) / 100, arr: rounded };
    default:
      return { mrr: rounded, arr: Math.round(rounded * 12 * 100) / 100 };
  }
}

/**
 * Phase 3: POST /api/billing/generate
 * Decoupled hybrid invoicing & recurring SaaS subscription generator.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { quotationId, billingInterval = BillingInterval.MONTHLY, notes, organizationId: explicitOrgId } = body;

    if (!quotationId) {
      return NextResponse.json(
        { success: false, error: "quotationId is required." },
        { status: 400 }
      );
    }

    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, ...(explicitOrgId && { organizationId: explicitOrgId }) },
      include: {
        customer: true,
        lines: {
          include: { product: true, variant: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: "Quotation not found." },
        { status: 404 }
      );
    }

    const orgId = quotation.organizationId;
    const year = new Date().getFullYear();
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const recurringLines = quotation.lines.filter((l) => l.itemType === CategoryType.SUBSCRIPTION);
    const hardwareLines = quotation.lines.filter((l) => l.itemType === CategoryType.HARDWARE);
    const serviceLines = quotation.lines.filter((l) => l.itemType === CategoryType.SERVICE);

    const result = await prisma.$transaction(async (tx) => {
      let createdSubscription = null;
      let createdSaaSInvoice = null;
      let createdServiceInvoice = null;

      // 1. Create Subscription for SaaS lines
      if (recurringLines.length > 0) {
        const existingSub = await tx.subscription.findFirst({
          where: { quotationId: quotation.id, organizationId: orgId },
          include: { lines: true },
        });

        if (!existingSub) {
          const subCount = await tx.subscription.count({ where: { organizationId: orgId } });
          const subscriptionNumber = `SUB-${year}-${String(subCount + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

          let recurringTotal = 0;
          const subLinesData = recurringLines.map((line) => {
            const gross = line.unitPrice * line.quantity;
            const discount = gross * (line.discountPercent / 100);
            const net = gross - discount;
            recurringTotal += net;

            return {
              quotationLineId: line.id,
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent,
              recurringAmount: Math.round(net * 100) / 100,
            };
          });

          const { mrr, arr } = calculateMrrArr(recurringTotal, billingInterval as BillingInterval);

          createdSubscription = await tx.subscription.create({
            data: {
              subscriptionNumber,
              quotationId: quotation.id,
              customerId: quotation.customerId,
              organizationId: orgId,
              status: SubscriptionStatus.ACTIVE,
              billingInterval: billingInterval as BillingInterval,
              currentPeriodStart: startDate,
              currentPeriodEnd: endDate,
              nextBillingDate: endDate,
              currentMrr: mrr,
              currentArr: arr,
              autoRenew: true,
              notes: notes || `SaaS subscription for quotation ${quotation.quoteNumber}`,
              lines: {
                create: subLinesData,
              },
            },
            include: { lines: true },
          });

          // Issue first cycle SaaS invoice
          const invCount = await tx.invoice.count({ where: { organizationId: orgId } });
          const saasInvoiceNumber = `INV-${year}-${String(invCount + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
          const subtotal = Math.round(recurringTotal * 100) / 100;
          const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

          createdSaaSInvoice = await tx.invoice.create({
            data: {
              invoiceNumber: saasInvoiceNumber,
              quotationId: quotation.id,
              subscriptionId: createdSubscription.id,
              customerId: quotation.customerId,
              organizationId: orgId,
              status: InvoiceStatus.ISSUED,
              issueDate: new Date(),
              dueDate,
              paymentTerms: "Net 15",
              subtotal,
              discountTotal: 0.0,
              taxTotal: 0.0,
              totalAmount: subtotal,
              amountPaid: 0.0,
              amountRemaining: subtotal,
              notes: `Recurring SaaS agreement (Period 1: ${billingInterval}).`,
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

      // 2. Service lines invoicing
      if (serviceLines.length > 0) {
        const invCount = await tx.invoice.count({ where: { organizationId: orgId } });
        const serviceInvoiceNumber = `INV-${year}-${String(invCount + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
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
      }

      return {
        subscription: createdSubscription,
        saasInvoice: createdSaaSInvoice,
        serviceInvoice: createdServiceInvoice,
        physicalGoodsSummary: {
          hardwareLinesCount: hardwareLines.length,
          policy: "Fulfillment-Triggered Invoicing: Physical hardware lines are invoiced upon dispatch (SHIPPED status).",
        },
      };
    });

    return NextResponse.json({
      success: true,
      message: "Hybrid billing and subscription entities generated successfully.",
      data: result,
    });
  } catch (error: any) {
    console.error("Billing generate error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate hybrid billing." },
      { status: 500 }
    );
  }
}
