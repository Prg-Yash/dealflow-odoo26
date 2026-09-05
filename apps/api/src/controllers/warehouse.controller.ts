import type { Response } from "express";
import { asyncHandler, AppError } from "../middleware/error.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createWarehouse,
  listWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
} from "../services/warehouse.service.js";

export const createWarehouseHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, code, location, shippingCostWeight } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Warehouse name is required (e.g. 'Main Warehouse', 'East Depot')."
    );
  }

  const warehouse = await createWarehouse({
    name,
    code,
    location,
    shippingCostWeight: shippingCostWeight ? Number(shippingCostWeight) : 1.0,
    organizationId: req.user!.organizationId!,
    createdById: req.user!.id,
  });

  return res.status(201).json({
    message: "Warehouse created successfully.",
    warehouse,
  });
});

export const listWarehousesHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const includeInactive = req.query.includeInactive === "true";
  const warehouses = await listWarehouses(req.user!.organizationId!, includeInactive);
  return res.json({ warehouses });
});

export const getWarehouseHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const warehouseId = req.params.id as string;
  const warehouse = await getWarehouseById(warehouseId, req.user!.organizationId!);

  if (!warehouse) {
    throw new AppError(404, "NOT_FOUND", "Warehouse not found.");
  }

  return res.json({ warehouse });
});

export const updateWarehouseHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const warehouseId = req.params.id as string;
  const { name, code, location, shippingCostWeight, isActive } = req.body;

  await updateWarehouse(warehouseId, req.user!.organizationId!, {
    name,
    code,
    location,
    shippingCostWeight: shippingCostWeight !== undefined ? Number(shippingCostWeight) : undefined,
    isActive,
  });

  const updated = await getWarehouseById(warehouseId, req.user!.organizationId!);

  return res.json({
    message: "Warehouse updated successfully.",
    warehouse: updated,
  });
});

export const deleteWarehouseHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const warehouseId = req.params.id as string;
  await deleteWarehouse(warehouseId, req.user!.organizationId!);

  return res.json({
    message: "Warehouse deactivated successfully.",
  });
});
