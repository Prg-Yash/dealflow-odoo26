export interface QuotationStallCandidate {
  id: string;
  quoteNumber: string;
  title?: string | null;
  stage: string;
  grandTotal: number;
  customerId?: string | null;
  customerName?: string | null;
  salesRepId?: string | null;
  salesRepName?: string | null;
  updatedAt: Date | string;
  createdAt?: Date | string;
}

export interface StalledDealsConfig {
  thresholdDays?: number; // default: 7 days
  asOfDate?: Date | string;
  activeStages?: string[]; // default: ["DRAFT", "PENDING_APPROVAL", "NEGOTIATION"]
}

export interface StalledQuotationAlert {
  quotationId: string;
  quoteNumber: string;
  title: string;
  stage: string;
  grandTotal: number;
  customerName: string;
  salesRepName: string;
  lastUpdated: string;
  daysInactive: number;
  thresholdDays: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface QuotationDiscountCandidate {
  id: string;
  quoteNumber: string;
  title?: string | null;
  salesRepId: string;
  salesRepName?: string | null;
  subtotal: number;
  discountTotal: number;
  discountPercent?: number;
  createdAt?: Date | string;
}

export interface SalesRepBaselineInput {
  id: string;
  name?: string | null;
  historicalAvgDiscount?: number | null;
}

export interface DiscountAnomalyConfig {
  multiplier?: number; // default: 1.5
  defaultOrgBaseline?: number; // default: 10.0%
  asOfDate?: Date | string;
}

export interface DiscountAnomalyAlert {
  quotationId: string;
  quoteNumber: string;
  salesRepId: string;
  salesRepName: string;
  quoteDiscountPercent: number;
  repBaselinePercent: number;
  baselineSource: "REP_HISTORICAL" | "ORG_FALLBACK";
  allowedCeilingPercent: number;
  excessPercent: number;
  multiplier: number;
  severity: "MEDIUM" | "HIGH";
}

export interface FulfillmentSlippageCandidate {
  id: string;
  fulfillmentNumber: string;
  quotationId?: string | null;
  status: string;
  createdAt: Date | string;
  promisedDate?: Date | string | null;
  shipments?: Array<{
    id: string;
    shipmentNumber: string;
    status: string;
    estimatedDelivery?: Date | string | null;
    carrier?: string | null;
    trackingNumber?: string | null;
  }>;
  backorders?: Array<{
    id: string;
    expectedDate?: Date | string | null;
    status: string;
  }>;
}

export interface SlippageConfig {
  asOfDate?: Date | string;
  slaDays?: number; // default: 7 days from creation
}

export interface FulfillmentSlippageAlert {
  fulfillmentOrderId: string;
  fulfillmentNumber: string;
  quotationId?: string | null;
  status: string;
  promisedDate: string;
  daysOverdue: number;
  pendingShipmentsCount: number;
  pendingBackordersCount: number;
  severity: "MEDIUM" | "HIGH";
}

/**
 * Pure engine function to detect quotations that have remained untouched beyond the configured threshold.
 */
export function detectStalledQuotations(
  quotations: QuotationStallCandidate[],
  config?: StalledDealsConfig
): StalledQuotationAlert[] {
  const thresholdDays = Math.max(1, config?.thresholdDays ?? 7);
  const asOf = config?.asOfDate ? new Date(config.asOfDate) : new Date();
  const activeStages = new Set(
    config?.activeStages ?? ["DRAFT", "PENDING_APPROVAL", "NEGOTIATION"]
  );

  const alerts: StalledQuotationAlert[] = [];

  for (const quote of quotations) {
    if (!activeStages.has(quote.stage)) {
      continue;
    }

    const updated = new Date(quote.updatedAt);
    const diffMs = asOf.getTime() - updated.getTime();
    const daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (daysInactive >= thresholdDays) {
      const severity: "LOW" | "MEDIUM" | "HIGH" =
        daysInactive >= thresholdDays * 3
          ? "HIGH"
          : daysInactive >= thresholdDays * 2
            ? "MEDIUM"
            : "LOW";

      alerts.push({
        quotationId: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title || "Untitled Deal",
        stage: quote.stage,
        grandTotal: Math.round(quote.grandTotal * 100) / 100,
        customerName: quote.customerName || "Unknown Customer",
        salesRepName: quote.salesRepName || "Unassigned",
        lastUpdated: updated.toISOString(),
        daysInactive,
        thresholdDays,
        severity,
      });
    }
  }

  return alerts.sort((a, b) => b.daysInactive - a.daysInactive);
}

/**
 * Pure engine function to detect discount anomalies exceeding a sales representative's historical average.
 *
 * CRITICAL RULE: A rep with no historicalAvgDiscount yet falls back to the org-wide average,
 * NEVER to zero — zero would flag every discount they've ever given.
 */
export function detectDiscountAnomalies(
  quotations: QuotationDiscountCandidate[],
  reps: SalesRepBaselineInput[],
  config?: DiscountAnomalyConfig
): DiscountAnomalyAlert[] {
  const multiplier = Math.max(1.0, config?.multiplier ?? 1.5);
  const defaultOrgBaseline = config?.defaultOrgBaseline ?? 10.0;

  // Compute organization-wide historical average discount from reps with established history
  const repsWithHistory = reps.filter(
    (r) => r.historicalAvgDiscount !== null && r.historicalAvgDiscount !== undefined && r.historicalAvgDiscount > 0
  );

  const orgAvgDiscount =
    repsWithHistory.length > 0
      ? Math.round(
          (repsWithHistory.reduce((sum, r) => sum + (r.historicalAvgDiscount || 0), 0) /
            repsWithHistory.length) *
            100
        ) / 100
      : defaultOrgBaseline;

  // Build rep baseline lookup map
  const repMap = new Map<string, SalesRepBaselineInput>();
  for (const rep of reps) {
    repMap.set(rep.id, rep);
  }

  const alerts: DiscountAnomalyAlert[] = [];

  for (const quote of quotations) {
    const rep = repMap.get(quote.salesRepId);

    // Determine baseline: rep's own historical average if > 0, otherwise org-wide fallback
    const hasRepHistory =
      rep &&
      rep.historicalAvgDiscount !== null &&
      rep.historicalAvgDiscount !== undefined &&
      rep.historicalAvgDiscount > 0;

    const repBaselinePercent = hasRepHistory
      ? Math.round((rep!.historicalAvgDiscount || 0) * 100) / 100
      : orgAvgDiscount;

    const baselineSource: "REP_HISTORICAL" | "ORG_FALLBACK" = hasRepHistory
      ? "REP_HISTORICAL"
      : "ORG_FALLBACK";

    const allowedCeilingPercent =
      Math.round(repBaselinePercent * multiplier * 100) / 100;

    // Determine actual quotation discount percentage
    const quoteDiscountPercent =
      quote.discountPercent !== undefined
        ? quote.discountPercent
        : quote.subtotal > 0
          ? Math.round((quote.discountTotal / quote.subtotal) * 10000) / 100
          : 0;

    if (quoteDiscountPercent > allowedCeilingPercent) {
      const excessPercent =
        Math.round((quoteDiscountPercent - allowedCeilingPercent) * 100) / 100;

      alerts.push({
        quotationId: quote.id,
        quoteNumber: quote.quoteNumber,
        salesRepId: quote.salesRepId,
        salesRepName: quote.salesRepName || rep?.name || "Unknown Rep",
        quoteDiscountPercent,
        repBaselinePercent,
        baselineSource,
        allowedCeilingPercent,
        excessPercent,
        multiplier,
        severity: excessPercent >= 10.0 ? "HIGH" : "MEDIUM",
      });
    }
  }

  return alerts.sort((a, b) => b.excessPercent - a.excessPercent);
}

/**
 * Pure engine function to detect fulfillment orders that have slipped past their promised delivery date.
 */
export function detectFulfillmentSlippage(
  orders: FulfillmentSlippageCandidate[],
  config?: SlippageConfig
): FulfillmentSlippageAlert[] {
  const asOf = config?.asOfDate ? new Date(config.asOfDate) : new Date();
  const slaDays = Math.max(1, config?.slaDays ?? 7);

  const alerts: FulfillmentSlippageAlert[] = [];

  for (const order of orders) {
    // Ignore terminal states
    if (order.status === "FULFILLED" || order.status === "CANCELLED") {
      continue;
    }

    // Determine promised date
    let promisedDate: Date | null = null;

    if (order.promisedDate) {
      promisedDate = new Date(order.promisedDate);
    } else if (order.shipments && order.shipments.length > 0) {
      // Find earliest estimated delivery among non-delivered shipments
      const pendingShipmentDates = order.shipments
        .filter((s) => s.status !== "DELIVERED" && s.status !== "CANCELLED" && s.estimatedDelivery)
        .map((s) => new Date(s.estimatedDelivery!));

      if (pendingShipmentDates.length > 0) {
        promisedDate = new Date(Math.min(...pendingShipmentDates.map((d) => d.getTime())));
      }
    }

    // If still no date, use order createdAt + slaDays
    if (!promisedDate) {
      const created = new Date(order.createdAt);
      promisedDate = new Date(created.getTime() + slaDays * 24 * 60 * 60 * 1000);
    }

    const diffMs = asOf.getTime() - promisedDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysOverdue > 0) {
      const pendingShipments =
        order.shipments?.filter((s) => s.status !== "DELIVERED" && s.status !== "CANCELLED")
          .length ?? 0;

      const pendingBackorders =
        order.backorders?.filter((b) => b.status === "PENDING_REPLENISHMENT").length ?? 0;

      alerts.push({
        fulfillmentOrderId: order.id,
        fulfillmentNumber: order.fulfillmentNumber,
        quotationId: order.quotationId,
        status: order.status,
        promisedDate: promisedDate.toISOString(),
        daysOverdue,
        pendingShipmentsCount: pendingShipments,
        pendingBackordersCount: pendingBackorders,
        severity: daysOverdue >= 7 ? "HIGH" : "MEDIUM",
      });
    }
  }

  return alerts.sort((a, b) => b.daysOverdue - a.daysOverdue);
}
