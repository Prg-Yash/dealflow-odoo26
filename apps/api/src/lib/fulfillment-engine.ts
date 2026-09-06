import {
  type WarehouseCandidate,
  type StockMap,
  scoreAndSortWarehouses,
  getAvailableStockFromMap,
} from "./warehouse-scoring.js";

export { type WarehouseCandidate } from "./warehouse-scoring.js";

export interface LineAllocation {
  warehouseId: string;
  warehouseName?: string | null;
  quantity: number;
  shippingCostWeight: number;
  shippingCostContribution: number;
}

export interface SplitLineResult {
  requiredQuantity: number;
  allocatedQuantity: number;
  backorderQuantity: number;
  allocations: LineAllocation[];
  estimatedShipmentCount: number;
}

export type StockByWarehouseInput = StockMap;

/**
 * Pure Waterfall Allocation Engine for Hardware Quotation Lines.
 *
 * Evaluates required quantity across warehouses sorted via the multi-tier scoring hierarchy:
 * 1. 100% Single-Shipment Capability first.
 * 2. Lowest shippingCostWeight second.
 * 3. Highest inventory capacity tie-breaker third.
 *
 * Greedily allocates available unreserved inventory.
 * Any unfulfilled remainder is flagged for backorder generation.
 *
 * @param requiredQty - Number of units demanded by the customer.
 * @param candidateWarehouses - List of active warehouse candidates.
 * @param stockByWarehouse - Unreserved stock availability per warehouse.
 * @returns SplitLineResult
 */
export function splitLine(
  requiredQty: number,
  candidateWarehouses: WarehouseCandidate[],
  stockByWarehouse: StockByWarehouseInput
): SplitLineResult {
  if (requiredQty <= 0) {
    return {
      requiredQuantity: 0,
      allocatedQuantity: 0,
      backorderQuantity: 0,
      allocations: [],
      estimatedShipmentCount: 0,
    };
  }

  // Evaluate and sort warehouses using the multi-tier scoring engine
  const sortedEvaluations = scoreAndSortWarehouses(
    requiredQty,
    candidateWarehouses,
    stockByWarehouse
  );

  let remaining = requiredQty;
  const allocations: LineAllocation[] = [];

  for (const evalResult of sortedEvaluations) {
    if (remaining <= 0) break;

    const available = Math.max(
      0,
      getAvailableStockFromMap(stockByWarehouse, evalResult.warehouseId)
    );
    if (available <= 0) continue;

    const allocated = Math.min(remaining, available);
    allocations.push({
      warehouseId: evalResult.warehouseId,
      warehouseName: evalResult.warehouseName,
      quantity: allocated,
      shippingCostWeight: evalResult.shippingCostWeight,
      shippingCostContribution:
        Math.round(allocated * evalResult.shippingCostWeight * 100) / 100,
    });

    remaining -= allocated;
  }

  const allocatedQuantity = requiredQty - remaining;
  const backorderQuantity = remaining;
  const estimatedShipmentCount = allocations.filter((a) => a.quantity > 0).length;

  return {
    requiredQuantity: requiredQty,
    allocatedQuantity,
    backorderQuantity,
    allocations,
    estimatedShipmentCount,
  };
}
