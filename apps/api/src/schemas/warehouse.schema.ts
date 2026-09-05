import { z } from "zod";
import { StockMovementType } from "@repo/db";

export const CreateWarehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  code: z.string().optional(),
  location: z.string().optional(),
  shippingCostWeight: z.number().min(0.1).default(1.0),
  isActive: z.boolean().default(true),
});

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial();

export const AdjustStockSchema = z.object({
  quantityDelta: z.number().int("Quantity delta must be an integer"),
  movementType: z.nativeEnum(StockMovementType).default(StockMovementType.ADJUSTMENT),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export const StockLevelQuerySchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  belowReorderPoint: z.enum(["true", "false"]).optional(),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type StockLevelQuery = z.infer<typeof StockLevelQuerySchema>;
