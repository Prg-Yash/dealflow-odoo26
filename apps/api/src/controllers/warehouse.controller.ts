import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as warehouseService from "../services/warehouse.service.js";

// =============================================================================
// Warehouses
// =============================================================================

export const createWarehouseHandler = asyncHandler(async (req: TenantRequest, res: Response) => {
  const warehouse = await warehouseService.createWarehouse(req.orgId, {
    ...req.body,
    createdById: req.user!.id,
  });

  return res.status(201).json({
    success: true,
    data: warehouse,
  });
});

export const listWarehousesHandler = asyncHandler(async (req: TenantRequest, res: Response) => {
  const includeInactive = req.query.includeInactive === "true";
  const warehouses = await warehouseService.listWarehouses(req.orgId, includeInactive);
  return res.json({ success: true, data: warehouses });
});

export const getWarehouseHandler = asyncHandler(async (req: TenantRequest, res: Response) => {
  const warehouse = await warehouseService.getWarehouseById(req.orgId, req.params.id as string);
  return res.json({ success: true, data: warehouse });
});

export const updateWarehouseHandler = asyncHandler(async (req: TenantRequest, res: Response) => {
  const warehouse = await warehouseService.updateWarehouse(
    req.orgId,
    req.params.id as string,
    req.body
  );
  return res.json({ success: true, data: warehouse });
});

export const deleteWarehouseHandler = asyncHandler(async (req: TenantRequest, res: Response) => {
  await warehouseService.deleteWarehouse(req.orgId, req.params.id as string);
  return res.json({ success: true, data: { message: "Warehouse deactivated successfully." } });
});

// =============================================================================
// Stock Levels & Ledger Operations
// =============================================================================

export const listStockLevels = asyncHandler(async (req: TenantRequest, res: Response) => {
  const stockLevels = await warehouseService.listStockLevels(req.orgId, req.query as any);
  return res.json({ success: true, data: stockLevels });
});

export const getStockLevel = asyncHandler(async (req: TenantRequest, res: Response) => {
  const stockLevel = await warehouseService.getStockLevelById(req.orgId, req.params.id as string);
  return res.json({ success: true, data: stockLevel });
});

export const getStockAvailable = asyncHandler(async (req: TenantRequest, res: Response) => {
  const available = await warehouseService.getStockAvailable(req.orgId, req.params.id as string);
  return res.json({ success: true, data: available });
});

export const manualAdjustStock = asyncHandler(async (req: TenantRequest, res: Response) => {
  const result = await warehouseService.manualAdjustStock(
    req.orgId,
    req.params.id as string,
    req.body
  );
  return res.json({ success: true, data: result });
});
