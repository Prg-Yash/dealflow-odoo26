export interface RiskLineInput {
  productId?: string;
  categoryId?: string;
  categoryCeiling?: number;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
}

export interface CalculatedLineRisk {
  lineCeiling: number;
  customerCeiling: number;
  categoryCeiling: number;
  overage: number;
  isCeilingBreached: boolean;
  riskPoints: number;
  discountAmount: number;
  netPrice: number;
  totalCost: number;
  lineMargin: number;
  lineMarginPercent: number;
}

export interface RiskEngineResult {
  blendedRiskScore: number;
  lines: CalculatedLineRisk[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPercent: number;
}

/**
 * Pure risk and live margin calculation engine for commercial quotations.
 *
 * For each line:
 * - lineCeiling = min(customerTierCeiling, categoryCeiling)
 * - overage = max(0, discountPercent - lineCeiling)
 * - isCeilingBreached = overage > 0
 * - riskPoints = overage
 *
 * Blended score = revenue-weighted average of overage across all lines:
 *   sum(overage * netPrice) / sum(netPrice)
 */
export function calculateBlendedRisk(
  lines: RiskLineInput[],
  customerTierCeiling: number,
  categoryCeilings?: Record<string, number> | Map<string, number>
): RiskEngineResult {
  if (!lines || lines.length === 0) {
    return {
      blendedRiskScore: 0,
      lines: [],
      subtotal: 0,
      discountTotal: 0,
      grandTotal: 0,
      totalCost: 0,
      grossMargin: 0,
      grossMarginPercent: 0,
    };
  }

  let subtotal = 0;
  let discountTotal = 0;
  let grandTotal = 0;
  let totalCost = 0;
  let weightedOverageSum = 0;

  const calculatedLines: CalculatedLineRisk[] = lines.map((line) => {
    let catCeiling = line.categoryCeiling;
    if (catCeiling === undefined && line.categoryId && categoryCeilings) {
      if (categoryCeilings instanceof Map) {
        catCeiling = categoryCeilings.get(line.categoryId);
      } else if (typeof categoryCeilings === "object") {
        catCeiling = categoryCeilings[line.categoryId];
      }
    }
    const resolvedCatCeiling = catCeiling !== undefined ? catCeiling : 100.0;
    const lineCeiling = Math.min(customerTierCeiling, resolvedCatCeiling);
    const overage = Math.max(0, line.discountPercent - lineCeiling);
    const isCeilingBreached = overage > 0;
    const riskPoints = Math.round(overage * 100) / 100;

    const grossRevenue = line.unitPrice * line.quantity;
    const discountAmount = grossRevenue * (line.discountPercent / 100);
    const netPrice = grossRevenue - discountAmount;
    const lineCost = line.costPrice * line.quantity;
    const lineMargin = netPrice - lineCost;
    const lineMarginPercent = netPrice > 0 ? (lineMargin / netPrice) * 100 : 0;

    subtotal += grossRevenue;
    discountTotal += discountAmount;
    grandTotal += netPrice;
    totalCost += lineCost;
    weightedOverageSum += overage * netPrice;

    return {
      lineCeiling: Math.round(lineCeiling * 100) / 100,
      customerCeiling: Math.round(customerTierCeiling * 100) / 100,
      categoryCeiling: Math.round(resolvedCatCeiling * 100) / 100,
      overage: Math.round(overage * 100) / 100,
      isCeilingBreached,
      riskPoints,
      discountAmount: Math.round(discountAmount * 100) / 100,
      netPrice: Math.round(netPrice * 100) / 100,
      totalCost: Math.round(lineCost * 100) / 100,
      lineMargin: Math.round(lineMargin * 100) / 100,
      lineMarginPercent: Math.round(lineMarginPercent * 100) / 100,
    };
  });

  const grossMargin = grandTotal - totalCost;
  const grossMarginPercent = grandTotal > 0 ? (grossMargin / grandTotal) * 100 : 0;
  const blendedRiskScore =
    grandTotal > 0 ? weightedOverageSum / grandTotal : 0;

  return {
    blendedRiskScore: Math.round(blendedRiskScore * 100) / 100,
    lines: calculatedLines,
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
  };
}
