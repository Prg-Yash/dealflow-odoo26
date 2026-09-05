import { prisma, QuoteStage, FulfillmentStatus } from "@repo/db";
import {
  detectStalledQuotations,
  detectDiscountAnomalies,
  detectFulfillmentSlippage,
  type QuotationStallCandidate,
  type QuotationDiscountCandidate,
  type SalesRepBaselineInput,
  type FulfillmentSlippageCandidate,
} from "../lib/deal-health-engine.js";
import type {
  QueryStalledDealsInput,
  QueryAnomaliesInput,
  QuerySlippageInput,
} from "../schemas/deal-health.schema.js";

// =============================================================================
// Deal Health Analytics Services
// =============================================================================

export async function getStalledQuotations(
  orgId: string,
  query: QueryStalledDealsInput
) {
  const quotations = await prisma.quotation.findMany({
    where: {
      organizationId: orgId,
      stage: {
        in: [QuoteStage.DRAFT, QuoteStage.PENDING_APPROVAL, QuoteStage.NEGOTIATION],
      },
    },
    include: {
      customer: true,
      salesRep: { include: { user: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  const candidates: QuotationStallCandidate[] = quotations.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    title: q.title,
    stage: q.stage,
    grandTotal: q.grandTotal,
    customerId: q.customerId,
    customerName: q.customer?.name ?? "Unknown Customer",
    salesRepId: q.salesRepId,
    salesRepName: q.salesRep?.user?.name ?? "Unassigned",
    updatedAt: q.updatedAt,
    createdAt: q.createdAt,
  }));

  const alerts = detectStalledQuotations(candidates, {
    thresholdDays: query.thresholdDays ?? 7,
    asOfDate: query.asOfDate,
  });

  return {
    count: alerts.length,
    thresholdDays: query.thresholdDays ?? 7,
    alerts,
  };
}

export async function getDiscountAnomalies(
  orgId: string,
  query: QueryAnomaliesInput
) {
  const [quotations, reps] = await Promise.all([
    prisma.quotation.findMany({
      where: {
        organizationId: orgId,
        discountTotal: { gt: 0 },
      },
      include: {
        salesRep: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesRepresentative.findMany({
      where: { organizationId: orgId },
      include: { user: true },
    }),
  ]);

  const candidates: QuotationDiscountCandidate[] = quotations.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    title: q.title,
    salesRepId: q.salesRepId,
    salesRepName: q.salesRep?.user?.name,
    subtotal: q.subtotal,
    discountTotal: q.discountTotal,
    createdAt: q.createdAt,
  }));

  const repInputs: SalesRepBaselineInput[] = reps.map((r) => ({
    id: r.id,
    name: r.user?.name,
    historicalAvgDiscount: r.historicalAvgDiscount,
  }));

  const alerts = detectDiscountAnomalies(candidates, repInputs, {
    multiplier: query.multiplier ?? 1.5,
    asOfDate: query.asOfDate,
  });

  return {
    count: alerts.length,
    multiplier: query.multiplier ?? 1.5,
    alerts,
  };
}

export async function getFulfillmentSlippage(
  orgId: string,
  query: QuerySlippageInput
) {
  const orders = await prisma.fulfillmentOrder.findMany({
    where: {
      organizationId: orgId,
      status: {
        in: [FulfillmentStatus.PENDING, FulfillmentStatus.PARTIALLY_FULFILLED],
      },
    },
    include: {
      shipments: true,
      backorders: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const candidates: FulfillmentSlippageCandidate[] = orders.map((o) => ({
    id: o.id,
    fulfillmentNumber: o.fulfillmentNumber,
    quotationId: o.quotationId,
    status: o.status,
    createdAt: o.createdAt,
    shipments: o.shipments.map((s) => ({
      id: s.id,
      shipmentNumber: s.shipmentNumber,
      status: s.status,
      estimatedDelivery: s.estimatedDelivery,
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
    })),
    backorders: o.backorders.map((b) => ({
      id: b.id,
      expectedDate: b.expectedDate,
      status: b.status,
    })),
  }));

  const alerts = detectFulfillmentSlippage(candidates, {
    asOfDate: query.asOfDate,
    slaDays: query.slaDays ?? 7,
  });

  return {
    count: alerts.length,
    alerts,
  };
}
