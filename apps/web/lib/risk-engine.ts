/**
 * Client-Side Risk & Threshold Calculation Engine
 * Synchronized with apps/api/src/lib/risk-engine.ts
 *
 * Implements:
 * - Line-level category ceiling & overage calculation
 * - Revenue-weighted overage per line (overage * line_value)
 * - Blended score = total_weighted_overage / total_order_value
 * - Edge case protection for empty quotations / zero order value
 */

export const DEFAULT_CATEGORY_DISCOUNT_THRESHOLD = 10.0; // 10% category allowed discount limit
export const DEFAULT_BLENDED_DISCOUNT_THRESHOLD = 10.0;  // 10% blended overage threshold

export interface RiskLineItem {
  id?: string;
  productId?: string;
  categoryId?: string;
  categoryName?: string;
  categoryCeiling?: number;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discountPercent: number;
}

export interface CalculatedLine {
  lineCeiling: number;
  categoryCeiling: number;
  actualDiscount: number;
  overage: number;
  isCeilingBreached: boolean;
  statusText: string;
  grossRevenue: number;
  discountAmount: number;
  netPrice: number; // line_value
  weightedOverage: number;
  lineMargin?: number;
  lineMarginPercent?: number;
}

export interface CalculatedRiskSummary {
  lines: CalculatedLine[];
  subtotal: number;
  discountTotal: number;
  totalOrderValue: number; // grandTotal before tax
  totalWeightedOverage: number;
  blendedScore: number;
  isBlendedBreached: boolean;
  hasCategoryBreach: boolean;
  requiresApproval: boolean;
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
 * Calculates live category overages, revenue-weighted overages, and the blended score.
 *
 * Formula:
 * - actual discount = line.discountPercent
 * - category allowed = line.categoryCeiling ?? 10%
 * - overage = max(0, actual_discount - category_allowed)
 * - line_value = grossRevenue - discountAmount = netPrice
 * - weighted_overage = overage * line_value
 * - blended_score = total_weighted_overage / total_order_value
 */
export function calculateQuotationRisk(
  lines: RiskLineItem[],
  customCategoryThreshold = DEFAULT_CATEGORY_DISCOUNT_THRESHOLD,
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
  // Edge Case: No products or empty quotation
  if (!lines || lines.length === 0) {
    return {
      lines: [],
      subtotal: 0,
      discountTotal: 0,
      totalOrderValue: 0,
      totalWeightedOverage: 0,
      blendedScore: 0,
      isBlendedBreached: false,
      hasCategoryBreach: false,
      requiresApproval: false,
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
  let totalWeightedOverage = 0;
  let hasCategoryBreach = false;

  const calculatedLines: CalculatedLine[] = lines.map((line) => {
    const qty = Math.max(0, line.quantity || 0);
    const unitPrice = Math.max(0, line.unitPrice || 0);
    const actualDiscount = Math.max(0, Math.min(100, line.discountPercent || 0));

    // Category ceiling limit (default 10% as specified)
    const categoryCeiling =
      typeof line.categoryCeiling === "number" && !isNaN(line.categoryCeiling)
        ? line.categoryCeiling
        : customCategoryThreshold;

    const lineCeiling = categoryCeiling;
    // Overage = max(0, actual discount - category allowed)
    const overage = Math.max(0, actualDiscount - lineCeiling);
    const isCeilingBreached = overage > 0;
    if (isCeilingBreached) hasCategoryBreach = true;

    const grossRevenue = unitPrice * qty;
    const discountAmount = grossRevenue * (actualDiscount / 100);
    const netPrice = grossRevenue - discountAmount; // line_value

    // Weighted overage = overage * line_value
    const weightedOverage = overage * netPrice;

    subtotal += grossRevenue;
    discountTotal += discountAmount;
    totalOrderValue += netPrice;
    totalWeightedOverage += weightedOverage;

    const statusText = isCeilingBreached
      ? `OVER (+${Math.round(overage * 10) / 10}%)`
      : "OK";

    return {
      lineCeiling: Math.round(lineCeiling * 10) / 10,
      categoryCeiling: Math.round(categoryCeiling * 10) / 10,
      actualDiscount: Math.round(actualDiscount * 10) / 10,
      overage: Math.round(overage * 10) / 10,
      isCeilingBreached,
      statusText,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      netPrice: Math.round(netPrice * 100) / 100,
      weightedOverage: Math.round(weightedOverage * 100) / 100,
    };
  });

  // Edge Case: Zero order value (e.g. all quantities or unit prices are 0)
  if (totalOrderValue <= 0) {
    return {
      lines: calculatedLines,
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      totalOrderValue: 0,
      totalWeightedOverage: 0,
      blendedScore: 0,
      isBlendedBreached: false,
      hasCategoryBreach,
      requiresApproval: hasCategoryBreach,
      requiresManagerApproval: hasCategoryBreach,
      requiresFinanceApproval: false,
      approvalType: hasCategoryBreach ? "SALES_MANAGER" : "NONE",
      approvalLabel: hasCategoryBreach ? "Requires Sales Manager Approval" : "Within Standard Approval Limits",
      escalationHops: hasCategoryBreach ? 1 : 0,
      isEmpty: false,
      errorMessage: "Total order value is ₹0. Please adjust product quantity or pricing.",
    };
  }

  // Blended score = total_weighted_overage / total_order_value
  const rawBlendedScore = totalWeightedOverage / totalOrderValue;
  const blendedScore = Math.round(rawBlendedScore * 100) / 100;
  const isBlendedBreached = blendedScore > customBlendedThreshold;
  const totalDiscountPercent = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;

  // Evaluate 3 Conditions:
  // Condition 1: 0 Hops (Direct Approval)
  // Condition 2: 1 Hop (Sales Manager Approval)
  // Condition 3: 2 Hops (Sales Manager + Finance Approval)
  let requiresManagerApproval = false;
  let requiresFinanceApproval = false;

  // 1. Evaluate custom discount rules if provided
  if (customDiscountRules && customDiscountRules.length > 0) {
    for (const rule of customDiscountRules) {
      if (rule.requiresFinanceApproval) {
        if (
          blendedScore >= (rule.minBlendedRiskScore ?? 0) ||
          totalDiscountPercent >= (rule.minDiscountPercent ?? 0)
        ) {
          requiresManagerApproval = true;
          requiresFinanceApproval = true;
        }
      } else if (rule.requiresManagerApproval) {
        if (
          blendedScore >= (rule.minBlendedRiskScore ?? 0) ||
          totalDiscountPercent >= (rule.minDiscountPercent ?? 0)
        ) {
          requiresManagerApproval = true;
        }
      }
    }
  }

  // 2. Baseline policy threshold triggers
  if (blendedScore > customBlendedThreshold || totalDiscountPercent > 15.0) {
    // Condition 3: High Risk (> 10% / > 15% discount) -> 2 Hops: Manager + Finance
    requiresManagerApproval = true;
    requiresFinanceApproval = true;
  } else if (blendedScore > 0 || hasCategoryBreach || totalDiscountPercent > 0) {
    // Condition 2: Moderate Risk -> 1 Hop: Sales Manager
    requiresManagerApproval = true;
  }

  const requiresApproval = requiresManagerApproval || requiresFinanceApproval;

  let approvalType: "NONE" | "SALES_MANAGER" | "DUAL_APPROVAL" = "NONE";
  let approvalLabel = "Within Standard Approval Limits";
  let escalationHops: 0 | 1 | 2 = 0;

  if (requiresManagerApproval && requiresFinanceApproval) {
    approvalType = "DUAL_APPROVAL";
    approvalLabel = "Requires Dual Approval (Sales Manager + Finance)";
    escalationHops = 2;
  } else if (requiresManagerApproval) {
    approvalType = "SALES_MANAGER";
    approvalLabel = "Requires Sales Manager Approval";
    escalationHops = 1;
  }

  let approvalReason: string | undefined;
  if (approvalType === "DUAL_APPROVAL") {
    approvalReason = `Blended score (${blendedScore}%) exceeds high-risk threshold (${customBlendedThreshold}%). Sequential authorization required: Sales Manager then Finance Ops.`;
  } else if (approvalType === "SALES_MANAGER") {
    approvalReason = `Blended score (${blendedScore}%) or line discount overage requires Sales Manager authorization.`;
  }

  return {
    lines: calculatedLines,
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    totalOrderValue: Math.round(totalOrderValue * 100) / 100,
    totalWeightedOverage: Math.round(totalWeightedOverage * 100) / 100,
    blendedScore,
    isBlendedBreached,
    hasCategoryBreach,
    requiresApproval,
    requiresManagerApproval,
    requiresFinanceApproval,
    approvalType,
    approvalLabel,
    escalationHops,
    approvalReason,
    isEmpty: false,
  };
}
