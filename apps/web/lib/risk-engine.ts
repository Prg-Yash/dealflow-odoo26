/**
 * Client-Side Risk & Threshold Calculation Engine
 * Synchronized with apps/api/src/lib/risk-engine.ts & sales_representative_plan.md
 *
 * Implements:
 * - Line-level ceiling = min(customerTierCeiling, categoryCeiling)
 * - Line overage = max(0, actualDiscount - lineCeiling)
 * - Revenue-weighted overage per line (overage * line_value)
 * - Blended risk score = total_weighted_overage / total_order_value
 * - 3-Condition Approval Governance Classification:
 *   • Condition 1 (0 Hops 🟢): Blended Risk = 0 & Total Discount <= 5% -> Auto-Approved
 *   • Condition 2 (1 Hop 🟡): Blended Risk <= 10 & Total Discount <= 15% -> Sales Manager
 *   • Condition 3 (2 Hops 🔴): Blended Risk > 10 OR Total Discount > 15% -> Manager + Finance
 */

export const DEFAULT_CATEGORY_DISCOUNT_THRESHOLD = 10.0; // 10% standard category ceiling
export const DEFAULT_BLENDED_DISCOUNT_THRESHOLD = 10.0;  // 10% blended threshold

export interface RiskLineItem {
  id?: string;
  productId?: string;
  categoryId?: string;
  categoryName?: string;
  categoryCeiling?: number;
  customerTierCeiling?: number;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discountPercent: number;
}

export interface CalculatedLine {
  lineCeiling: number;
  categoryCeiling: number;
  customerCeiling: number;
  actualDiscount: number;
  overage: number;
  isCeilingBreached: boolean;
  statusText: string;
  grossRevenue: number;
  discountAmount: number;
  netPrice: number; // line_value
  weightedOverage: number;
  totalCost?: number;
  lineMargin?: number;
  lineMarginPercent?: number;
}

export interface ApprovalClassification {
  condition: 1 | 2 | 3;
  label: string;
  badgeText: string;
  color: "emerald" | "amber" | "rose";
  requiresManager: boolean;
  requiresFinance: boolean;
  description: string;
}

export interface CalculatedRiskSummary {
  lines: CalculatedLine[];
  subtotal: number;
  discountTotal: number;
  totalOrderValue: number; // grandTotal before tax
  totalCost: number;
  grossMargin: number;
  grossMarginPercent: number;
  totalDiscountPercent: number;
  totalWeightedOverage: number;
  blendedScore: number;
  isBlendedBreached: boolean;
  hasCategoryBreach: boolean;
  requiresApproval: boolean;
  classification: ApprovalClassification;
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  approvalType: "NONE" | "SALES_MANAGER" | "DUAL_APPROVAL";
  approvalLabel: string;
  escalationHops: 0 | 1 | 2;
  approvalReason?: string;
  isEmpty: boolean;
  errorMessage?: string;
}

/**
 * Returns the exact 3-Condition approval governance classification.
 */
export function getApprovalClassification(
  blendedRiskScore: number,
  totalDiscountPercent: number
): ApprovalClassification {
  if (blendedRiskScore === 0 && totalDiscountPercent <= 5.0) {
    return {
      condition: 1,
      label: "Condition 1: Auto-Approved (0 Hops)",
      badgeText: "0 Hops (Auto-Approved)",
      color: "emerald",
      requiresManager: false,
      requiresFinance: false,
      description:
        "Zero overage and discount within standard 5% discretion. The quotation is auto-approved and will be directly available to the client upon submission.",
    };
  } else if (blendedRiskScore <= 10.0 && totalDiscountPercent <= 15.0) {
    return {
      condition: 2,
      label: "Condition 2: Sales Manager Sign-off (1 Hop)",
      badgeText: "1 Hop (Manager)",
      color: "amber",
      requiresManager: true,
      requiresFinance: false,
      description:
        "Moderate discount breach. Requires 1-hop sign-off from the Sales Manager before customer review.",
    };
  } else {
    return {
      condition: 3,
      label: "Condition 3: Multi-hop Escalation (Sales Manager → Finance Ops)",
      badgeText: "2 Hops (Manager → Finance)",
      color: "rose",
      requiresManager: true,
      requiresFinance: true,
      description:
        "High risk discount / ceiling breach. Requires sequential 2-hop approval: Sales Manager approval followed by Finance Operations verification.",
    };
  }
}

/**
 * Calculates live category overages, revenue-weighted overages, blended risk score,
 * and deal gross margins.
 */
export function calculateQuotationRisk(
  lines: RiskLineItem[],
  customCategoryThreshold = DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
  customerTierCeiling = 100.0,
  customBlendedThreshold = DEFAULT_BLENDED_DISCOUNT_THRESHOLD,
  customDiscountRules?: Array<{
    minDiscountPercent?: number;
    maxDiscountPercent?: number;
    minBlendedRiskScore?: number;
    maxBlendedRiskScore?: number;
    requiresManagerApproval?: boolean;
    requiresFinanceApproval?: boolean;
  }>
): CalculatedRiskSummary {
  if (!lines || lines.length === 0) {
    const defaultClassification = getApprovalClassification(0, 0);
    return {
      lines: [],
      subtotal: 0,
      discountTotal: 0,
      totalOrderValue: 0,
      totalCost: 0,
      grossMargin: 0,
      grossMarginPercent: 0,
      totalDiscountPercent: 0,
      totalWeightedOverage: 0,
      blendedScore: 0,
      isBlendedBreached: false,
      hasCategoryBreach: false,
      requiresApproval: false,
      classification: defaultClassification,
      requiresManagerApproval: false,
      requiresFinanceApproval: false,
      approvalType: "NONE",
      approvalLabel: "Within Standard Approval Limits",
      escalationHops: 0,
      isEmpty: true,
      errorMessage: "No products in quotation. Add at least one product to calculate thresholds.",
    };
  }

  let subtotal = 0;
  let discountTotal = 0;
  let totalOrderValue = 0;
  let totalCost = 0;
  let totalWeightedOverage = 0;
  let hasCategoryBreach = false;

  const calculatedLines: CalculatedLine[] = lines.map((line) => {
    const qty = Math.max(0, line.quantity || 0);
    const unitPrice = Math.max(0, line.unitPrice || 0);
    const costPrice = Math.max(0, line.costPrice || 0);
    const actualDiscount = Math.max(0, Math.min(100, line.discountPercent || 0));

    const categoryCeiling =
      typeof line.categoryCeiling === "number" && !isNaN(line.categoryCeiling)
        ? line.categoryCeiling
        : customCategoryThreshold;

    const tierCeiling =
      typeof line.customerTierCeiling === "number" && !isNaN(line.customerTierCeiling)
        ? line.customerTierCeiling
        : customerTierCeiling;

    const lineCeiling = Math.min(tierCeiling, categoryCeiling);
    const overage = Math.max(0, actualDiscount - lineCeiling);
    const isCeilingBreached = overage > 0;
    if (isCeilingBreached) hasCategoryBreach = true;

    const grossRevenue = unitPrice * qty;
    const discountAmount = grossRevenue * (actualDiscount / 100);
    const netPrice = grossRevenue - discountAmount; // line_value
    const lineCost = costPrice * qty;
    const lineMargin = netPrice - lineCost;
    const lineMarginPercent = netPrice > 0 ? (lineMargin / netPrice) * 100 : 0;

    const weightedOverage = overage * netPrice;

    subtotal += grossRevenue;
    discountTotal += discountAmount;
    totalOrderValue += netPrice;
    totalCost += lineCost;
    totalWeightedOverage += weightedOverage;

    const statusText = isCeilingBreached
      ? `OVER (+${Math.round(overage * 10) / 10}%)`
      : "OK";

    return {
      lineCeiling: Math.round(lineCeiling * 10) / 10,
      categoryCeiling: Math.round(categoryCeiling * 10) / 10,
      customerCeiling: Math.round(tierCeiling * 10) / 10,
      actualDiscount: Math.round(actualDiscount * 10) / 10,
      overage: Math.round(overage * 10) / 10,
      isCeilingBreached,
      statusText,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      netPrice: Math.round(netPrice * 100) / 100,
      weightedOverage: Math.round(weightedOverage * 100) / 100,
      totalCost: Math.round(lineCost * 100) / 100,
      lineMargin: Math.round(lineMargin * 100) / 100,
      lineMarginPercent: Math.round(lineMarginPercent * 10) / 10,
    };
  });

  const grossMargin = totalOrderValue - totalCost;
  const grossMarginPercent = totalOrderValue > 0 ? (grossMargin / totalOrderValue) * 100 : 0;
  const totalDiscountPercent = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;

  const rawBlendedScore = totalOrderValue > 0 ? totalWeightedOverage / totalOrderValue : 0;
  const blendedScore = Math.round(rawBlendedScore * 10) / 10;
  const isBlendedBreached = blendedScore > customBlendedThreshold;

  const classification = getApprovalClassification(blendedScore, totalDiscountPercent);
  const requiresApproval = classification.condition !== 1;
  const requiresManagerApproval = classification.requiresManager;
  const requiresFinanceApproval = classification.requiresFinance;

  let approvalType: "NONE" | "SALES_MANAGER" | "DUAL_APPROVAL" = "NONE";
  let escalationHops: 0 | 1 | 2 = 0;
  if (classification.condition === 3) {
    approvalType = "DUAL_APPROVAL";
    escalationHops = 2;
  } else if (classification.condition === 2) {
    approvalType = "SALES_MANAGER";
    escalationHops = 1;
  }

  return {
    lines: calculatedLines,
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    totalOrderValue: Math.round(totalOrderValue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
    totalDiscountPercent: Math.round(totalDiscountPercent * 10) / 10,
    totalWeightedOverage: Math.round(totalWeightedOverage * 100) / 100,
    blendedScore,
    isBlendedBreached,
    hasCategoryBreach,
    requiresApproval,
    classification,
    requiresManagerApproval,
    requiresFinanceApproval,
    approvalType,
    approvalLabel: classification.label,
    escalationHops,
    approvalReason: classification.description,
    isEmpty: false,
  };
}
