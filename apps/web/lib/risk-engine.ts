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
  customBlendedThreshold = DEFAULT_BLENDED_DISCOUNT_THRESHOLD
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
      isEmpty: false,
      errorMessage: "Total order value is ₹0. Please adjust product quantity or pricing.",
    };
  }

  // Blended score = total_weighted_overage / total_order_value
  const rawBlendedScore = totalWeightedOverage / totalOrderValue;
  const blendedScore = Math.round(rawBlendedScore * 100) / 100;
  const isBlendedBreached = blendedScore > customBlendedThreshold;

  const requiresApproval = isBlendedBreached || hasCategoryBreach;

  let approvalReason: string | undefined;
  if (isBlendedBreached && hasCategoryBreach) {
    approvalReason = `Blended score (${blendedScore}%) exceeds threshold (${customBlendedThreshold}%) and one or more items exceed category discount limits.`;
  } else if (isBlendedBreached) {
    approvalReason = `Blended score (${blendedScore}%) exceeds the allowed threshold of ${customBlendedThreshold}%.`;
  } else if (hasCategoryBreach) {
    approvalReason = `One or more items exceed their category discount ceiling limit (${customCategoryThreshold}%).`;
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
    approvalReason,
    isEmpty: false,
  };
}
