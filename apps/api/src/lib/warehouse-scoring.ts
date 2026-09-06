/**
 * Pure mathematical scoring and warehouse sorting engine for DealFlow360.
 *
 * Sorting Hierarchy:
 * 1. Primary: Ability to fulfill 100% of the line item quantity in a single shipment (minimizes split parcels).
 * 2. Secondary: Admin-defined shipping cost weight (shippingCostWeight ascending, minimizes freight costs).
 * 3. Tertiary: Available stock descending (maximizes single-parcel capacity when splitting is unavoidable).
 */

export interface WarehouseCandidate {
  id: string;
  name?: string | null;
  code?: string | null;
  shippingCostWeight: number;
}

export interface WarehouseEvaluation {
  warehouseId: string;
  warehouseName: string | null;
  shippingCostWeight: number;
  availableStock: number;
  canFulfill100Percent: boolean;
  score: number;
}

export type StockMap =
  | Record<string, number>
  | Map<string, number>
  | Array<{ warehouseId: string; availableQuantity: number }>;

/**
 * Extracts available stock for a given warehouse from various map/dictionary representations.
 */
export function getAvailableStockFromMap(stockMap: StockMap, warehouseId: string): number {
  if (stockMap instanceof Map) {
    return stockMap.get(warehouseId) ?? 0;
  }
  if (Array.isArray(stockMap)) {
    const found = stockMap.find((item) => item.warehouseId === warehouseId);
    return found ? Math.max(0, found.availableQuantity) : 0;
  }
  if (typeof stockMap === "object" && stockMap !== null) {
    return Math.max(0, stockMap[warehouseId] ?? 0);
  }
  return 0;
}

/**
 * Calculates a deterministic fulfillment priority score for a warehouse.
 * Lower score = higher allocation priority.
 *
 * Scoring breakdown:
 * - 100% Single-Shipment Capability: 0 penalty points (or +1000 penalty points if unable to fulfill 100%).
 * - Freight Cost Weighting: shippingCostWeight * 10 (e.g. weight 1.0 = +10 pts, weight 1.5 = +15 pts).
 * - Capacity Tie-Breaker: - (availableStock / demandedQty) fraction (up to -1 pt bonus for higher volume).
 */
export function calculateWarehouseScore(
  demandedQty: number,
  availableStock: number,
  shippingCostWeight: number
): { score: number; canFulfill100Percent: boolean } {
  if (demandedQty <= 0) {
    return { score: shippingCostWeight, canFulfill100Percent: true };
  }

  const canFulfill100Percent = availableStock >= demandedQty;
  const fulfillmentTierPenalty = canFulfill100Percent ? 0 : 1000;
  const freightWeightComponent = shippingCostWeight * 10;
  const volumeBonus = Math.min(availableStock, demandedQty) / demandedQty;

  const score = fulfillmentTierPenalty + freightWeightComponent - volumeBonus;

  return {
    score: Math.round(score * 1000) / 1000,
    canFulfill100Percent,
  };
}

/**
 * Evaluates and sorts all candidate warehouses for a given demanded quantity and stock distribution.
 *
 * @param demandedQty - The required quantity for a quotation line item.
 * @param warehouses - Array of candidate warehouse records.
 * @param stockMap - Current unreserved inventory count available per warehouse.
 * @returns Array of evaluated warehouses sorted by highest fulfillment priority (lowest score first).
 */
export function scoreAndSortWarehouses(
  demandedQty: number,
  warehouses: WarehouseCandidate[],
  stockMap: StockMap
): WarehouseEvaluation[] {
  const evaluations: WarehouseEvaluation[] = warehouses.map((wh) => {
    const availableStock = getAvailableStockFromMap(stockMap, wh.id);
    const { score, canFulfill100Percent } = calculateWarehouseScore(
      demandedQty,
      availableStock,
      wh.shippingCostWeight ?? 1.0
    );

    return {
      warehouseId: wh.id,
      warehouseName: wh.name ?? null,
      shippingCostWeight: wh.shippingCostWeight ?? 1.0,
      availableStock,
      canFulfill100Percent,
      score,
    };
  });

  // Sort ascending by composite score (lowest score = best candidate)
  evaluations.sort((a, b) => {
    // 1. Primary: 100% capacity check
    if (a.canFulfill100Percent !== b.canFulfill100Percent) {
      return a.canFulfill100Percent ? -1 : 1;
    }
    // 2. Secondary: Shipping cost weight
    if (a.shippingCostWeight !== b.shippingCostWeight) {
      return a.shippingCostWeight - b.shippingCostWeight;
    }
    // 3. Tertiary: Higher available stock
    return b.availableStock - a.availableStock;
  });

  return evaluations;
}
