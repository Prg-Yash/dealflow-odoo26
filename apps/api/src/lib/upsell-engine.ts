export interface UpsellCandidate {
  productId: string;
  productName: string;
  sku?: string;
  basePrice: number;
  costPrice: number;
  coPurchaseScore: number;
  isPromoted: boolean;
  promotionalTag?: string | null;
  minMarginThreshold: number;
}

export interface RankedUpsellSuggestion {
  productId: string;
  productName: string;
  sku?: string;
  basePrice: number;
  costPrice: number;
  marginPercent: number;
  score: number;
  promotionalTag?: string | null;
  isPromoted: boolean;
}

const PROMOTED_SCORE_BONUS = 5.0;

/**
 * Pure business engine for ranking cross-sell and upsell suggestions.
 * Calculates live margin percentage, strictly eliminates any candidate below minMarginThreshold,
 * and sorts survivors by (coPurchaseScore + isPromoted bonus).
 */
export function rankUpsellSuggestions(candidates: UpsellCandidate[]): RankedUpsellSuggestion[] {
  return candidates
    .map((c) => {
      const margin = c.basePrice > 0 ? ((c.basePrice - c.costPrice) / c.basePrice) * 100 : 0;
      const score = c.coPurchaseScore + (c.isPromoted ? PROMOTED_SCORE_BONUS : 0);
      return {
        productId: c.productId,
        productName: c.productName,
        sku: c.sku,
        basePrice: c.basePrice,
        costPrice: c.costPrice,
        marginPercent: Math.round(margin * 100) / 100,
        score: Math.round(score * 100) / 100,
        promotionalTag: c.promotionalTag,
        isPromoted: c.isPromoted,
        minMarginThreshold: c.minMarginThreshold,
      };
    })
    .filter((item) => item.marginPercent >= item.minMarginThreshold)
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      marginPercent: item.marginPercent,
      reason: item.reason,
      score: item.score,
      promotionalTag: item.promotionalTag,
      isPromoted: item.isPromoted,
    }));
}
