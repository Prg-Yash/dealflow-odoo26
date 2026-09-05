import { prisma, StockMovementType, type Prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  AdjustStockInput,
  StockLevelQuery,
} from "../schemas/warehouse.schema.js";

// =============================================================================
// Warehouse CRUD
// =============================================================================

export async function createWarehouse(
  organizationId: string,
  input: CreateWarehouseInput & { createdById?: string }
) {
  const code =
    input.code?.trim() ||
    input.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

  return prisma.warehouse.create({
    data: {
      name: input.name.trim(),
      code,
      location: input.location?.trim(),
      shippingCostWeight: input.shippingCostWeight || 1.0,
      isActive: input.isActive ?? true,
      organizationId,
      createdById: input.createdById,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listWarehouses(organizationId: string, includeInactive = false) {
  return prisma.warehouse.findMany({
    where: {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      _count: { select: { stockLevels: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWarehouseById(organizationId: string, id: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, organizationId },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { stockLevels: true } },
    },
  });

  if (!warehouse) {
    throw new AppError(404, "NOT_FOUND", "Warehouse not found.");
  }

  return warehouse;
}

export async function updateWarehouse(
  organizationId: string,
  id: string,
  data: UpdateWarehouseInput
) {
  await getWarehouseById(organizationId, id);

  return prisma.warehouse.update({
    where: { id },
    data,
  });
}

export async function deleteWarehouse(organizationId: string, id: string) {
  await getWarehouseById(organizationId, id);

  return prisma.warehouse.update({
    where: { id },
    data: { isActive: false },
  });
}

import { enqueueBackorderConsolidation } from "../queues/backorder.queue.js";

// =============================================================================
// Shared Stock Ledger Engine: adjustStock()
// =============================================================================

export interface AdjustStockParams {
  organizationId: string;
  warehouseId: string;
  productId: string;
  variantId?: string | null;
  quantityDelta?: number;
  reservedDelta?: number;
  movementType?: StockMovementType;
  referenceId?: string;
  notes?: string;
  tx?: Prisma.TransactionClient;
}

/**
 * Shared atomic stock adjustment function.
 * MUST be invoked by all workflows altering inventory (manual, fulfillment, backorders).
 * Guarantees every StockLevel update writes a paired StockMovement audit ledger entry.
 */
export async function adjustStock({
  organizationId,
  warehouseId,
  productId,
  variantId,
  quantityDelta,
  reservedDelta,
  movementType = StockMovementType.ADJUSTMENT,
  referenceId,
  notes,
  tx,
}: AdjustStockParams) {
  const qDelta = quantityDelta ?? 0;
  const rDelta = reservedDelta ?? 0;

  const executeInTx = async (client: Prisma.TransactionClient) => {
    // Validate warehouse and product tenant scoping
    const [warehouse, product] = await Promise.all([
      client.warehouse.findFirst({ where: { id: warehouseId, organizationId } }),
      client.product.findFirst({ where: { id: productId, organizationId } }),
    ]);

    if (!warehouse) throw new AppError(400, "INVALID_WAREHOUSE", "Warehouse not found in this organization.");
    if (!product) throw new AppError(400, "INVALID_PRODUCT", "Product not found in this organization.");

    let validatedVariant = null;
    if (variantId) {
      validatedVariant = await client.productVariant.findFirst({
        where: { id: variantId, productId },
      });
      if (!validatedVariant) {
        throw new AppError(400, "INVALID_VARIANT", "Product variant not found for this product.");
      }
    }

    const normalizedVariantId = variantId || null;

    // Locate existing stock level record (supports both base product and variant stock)
    let stockLevel = await client.stockLevel.findFirst({
      where: {
        warehouseId,
        productId,
        variantId: normalizedVariantId,
      },
      include: {
        warehouse: true,
        product: true,
        variant: true,
      },
    });

    if (stockLevel) {
      stockLevel = await client.stockLevel.update({
        where: { id: stockLevel.id },
        data: {
          ...(qDelta !== 0 && { quantityOnHand: { increment: qDelta } }),
          ...(rDelta !== 0 && { quantityReserved: { increment: rDelta } }),
        },
        include: {
          warehouse: true,
          product: true,
          variant: true,
        },
      });
    } else {
      stockLevel = await client.stockLevel.create({
        data: {
          warehouseId,
          productId,
          variantId: normalizedVariantId,
          quantityOnHand: Math.max(0, qDelta),
          quantityReserved: Math.max(0, rDelta),
          reorderPoint: 10,
        },
        include: {
          warehouse: true,
          product: true,
          variant: true,
        },
      });
    }

    // Enforce non-negative physical stock
    if (stockLevel.quantityOnHand < 0) {
      const itemLabel = validatedVariant
        ? `${product.name} (${validatedVariant.attributeName}: ${validatedVariant.attributeValue})`
        : product.name;
      throw new AppError(
        400,
        "INSUFFICIENT_STOCK",
        `Stock adjustment would cause negative on-hand quantity (${stockLevel.quantityOnHand}) for '${itemLabel}' in warehouse '${warehouse.name}'.`
      );
    }

    // Enforce non-negative reservations
    if (stockLevel.quantityReserved < 0) {
      throw new AppError(
        400,
        "INSUFFICIENT_RESERVATION",
        `Stock adjustment would cause negative reserved quantity (${stockLevel.quantityReserved}) for product '${product.name}' in warehouse '${warehouse.name}'.`
      );
    }

    // Always create paired StockMovement ledger entry
    const movementQuantity = qDelta !== 0 ? qDelta : rDelta;
    const movement = await client.stockMovement.create({
      data: {
        warehouseId,
        productId,
        variantId: normalizedVariantId,
        quantity: movementQuantity,
        movementType,
        referenceId,
        notes,
      },
    });

    const quantityAvailable = stockLevel.quantityOnHand - stockLevel.quantityReserved;
    const isBelowReorderPoint = quantityAvailable <= stockLevel.reorderPoint;

    return {
      stockLevel: {
        ...stockLevel,
        quantityAvailable,
        isBelowReorderPoint,
      },
      movement,
    };
  };

  let result;
  if (tx) {
    result = await executeInTx(tx);
  } else {
    result = await prisma.$transaction(async (client) => {
      return executeInTx(client);
    });
  }

  // If positive stock replenishment occurred, enqueue BullMQ backorder consolidation job
  if (qDelta > 0) {
    enqueueBackorderConsolidation(organizationId, productId, warehouseId).catch(() => { });
  }

  return result;
}

// =============================================================================
// Stock Levels Queries & Manual Adjustments
// =============================================================================

export async function listStockLevels(organizationId: string, query?: StockLevelQuery) {
  const stockLevels = await prisma.stockLevel.findMany({
    where: {
      warehouse: { organizationId },
      ...(query?.productId ? { productId: query.productId } : {}),
      ...(query?.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query?.variantId ? { variantId: query.variantId } : {}),
    },
    include: {
      warehouse: { select: { id: true, name: true, code: true, shippingCostWeight: true } },
      product: { select: { id: true, name: true, sku: true, basePrice: true } },
      variant: { select: { id: true, attributeName: true, attributeValue: true, sku: true, extraPrice: true } },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { product: { name: "asc" } }],
  });

  const enriched = stockLevels.map((s) => {
    const quantityAvailable = s.quantityOnHand - s.quantityReserved;
    return {
      ...s,
      quantityAvailable,
      isBelowReorderPoint: quantityAvailable <= s.reorderPoint,
    };
  });

  if (query?.belowReorderPoint === "true") {
    return enriched.filter((s) => s.isBelowReorderPoint);
  }

  return enriched;
}

export async function getStockLevelById(organizationId: string, id: string) {
  const stockLevel = await prisma.stockLevel.findFirst({
    where: {
      id,
      warehouse: { organizationId },
    },
    include: {
      warehouse: true,
      product: true,
      variant: true,
    },
  });

  if (!stockLevel) {
    throw new AppError(404, "NOT_FOUND", "Stock level not found.");
  }

  const quantityAvailable = stockLevel.quantityOnHand - stockLevel.quantityReserved;
  return {
    ...stockLevel,
    quantityAvailable,
    isBelowReorderPoint: quantityAvailable <= stockLevel.reorderPoint,
  };
}

export async function getStockAvailable(organizationId: string, id: string) {
  const stockLevel = await getStockLevelById(organizationId, id);
  return {
    stockLevelId: stockLevel.id,
    quantityOnHand: stockLevel.quantityOnHand,
    quantityReserved: stockLevel.quantityReserved,
    quantityAvailable: stockLevel.quantityAvailable,
    reorderPoint: stockLevel.reorderPoint,
    isBelowReorderPoint: stockLevel.isBelowReorderPoint,
    warehouse: {
      id: stockLevel.warehouse.id,
      name: stockLevel.warehouse.name,
      shippingCostWeight: stockLevel.warehouse.shippingCostWeight,
    },
    product: {
      id: stockLevel.product.id,
      name: stockLevel.product.name,
      sku: stockLevel.product.sku,
    },
    variant: stockLevel.variant
      ? {
        id: stockLevel.variant.id,
        attributeName: stockLevel.variant.attributeName,
        attributeValue: stockLevel.variant.attributeValue,
        sku: stockLevel.variant.sku,
      }
      : null,
  };
}

export async function manualAdjustStock(
  organizationId: string,
  stockLevelId: string,
  input: AdjustStockInput
) {
  const current = await getStockLevelById(organizationId, stockLevelId);

  return adjustStock({
    organizationId,
    warehouseId: current.warehouseId,
    productId: current.productId,
    variantId: input.variantId !== undefined ? input.variantId : current.variantId,
    quantityDelta: input.quantityDelta,
    movementType: input.movementType,
    referenceId: input.referenceId,
    notes: input.notes,
  });
}

export async function listStockMovements(
  organizationId: string,
  query?: { productId?: string; warehouseId?: string; limit?: number }
) {
  return prisma.stockMovement.findMany({
    where: {
      warehouse: { organizationId },
      ...(query?.productId ? { productId: query.productId } : {}),
      ...(query?.warehouseId ? { warehouseId: query.warehouseId } : {}),
    },
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
      product: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
    },
    orderBy: { createdAt: "desc" },
    take: query?.limit ? Number(query.limit) : 50,
  });
}

