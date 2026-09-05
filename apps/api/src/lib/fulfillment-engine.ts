export interface WarehouseCandidate {
  id: string;
  name?: string | null;
  code?: string | null;
  shippingCostWeight: number;
}

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

export type StockByWarehouseInput =
  | Record<string, number>
  | Map<string, number>
  | Array<{ warehouseId: string; availableQuantity: number }>;

function getAvailableStock(stockByWarehouse: StockByWarehouseInput, warehouseId: string): number {
  if (stockByWarehouse instanceof Map) {
    return stockByWarehouse.get(warehouseId) ?? 0;
  }
  if (Array.isArray(stockByWarehouse)) {
    const entry = stockByWarehouse.find((s) => s.warehouseId === warehouseId);
    return entry ? entry.availableQuantity : 0;
  }
  if (typeof stockByWarehouse === "object" && stockByWarehouse !== null) {
    return stockByWarehouse[warehouseId] ?? 0;
  }
  return 0;
}

/**
 * Pure fulfillment greedy split engine.
 *
 * Evaluates required quantity across warehouses sorted ascending by shippingCostWeight.
 * Greedily allocates available inventory from the cheapest facility first.
 * Any unfulfilled remainder is flagged as a backorder.
 *
 * @param requiredQty - Number of units demanded
 * @param warehousesSortedByShippingCost - Facilities sorted by shipping cost weight
 * @param stockByWarehouse - Available inventory per facility
 * @returns SplitLineResult
 */
export function splitLine(
  requiredQty: number,
  warehousesSortedByShippingCost: WarehouseCandidate[],
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

  // Ensure deterministic ascending order by shipping cost weight
  const sortedWarehouses = [...warehousesSortedByShippingCost].sort(
    (a, b) => a.shippingCostWeight - b.shippingCostWeight
  );

  let remaining = requiredQty;
  const allocations: LineAllocation[] = [];

  for (const wh of sortedWarehouses) {
    if (remaining <= 0) break;

    const available = Math.max(0, getAvailableStock(stockByWarehouse, wh.id));
    if (available <= 0) continue;

    const allocated = Math.min(remaining, available);
    allocations.push({
      warehouseId: wh.id,
      warehouseName: wh.name,
      quantity: allocated,
      shippingCostWeight: wh.shippingCostWeight,
      shippingCostContribution: Math.round(allocated * wh.shippingCostWeight * 100) / 100,
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
