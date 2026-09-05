import { Router, type Response } from "express";
import { UserRole } from "@repo/db";
import {
  requireAuth,
  requireRole,
  requireOrg,
  type AuthRequest,
} from "../middleware/auth.middleware.js";
import {
  createWarehouse,
  listWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
} from "../services/warehouse.service.js";

export const warehouseRouter = Router();

/**
 * POST /api/warehouses
 * Admin creates a new fulfillment warehouse
 */
warehouseRouter.post(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN),
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, code, location, shippingCostWeight } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Warehouse name is required (e.g. 'Main Warehouse', 'East Depot').",
        });
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
    } catch (error) {
      return res.status(500).json({
        error: "Failed to create warehouse",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/warehouses
 * Lists all active warehouses for the authenticated user's organization
 */
warehouseRouter.get(
  "/",
  requireAuth,
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const warehouses = await listWarehouses(
        req.user!.organizationId!,
        includeInactive
      );
      return res.json({ warehouses });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to list warehouses",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/warehouses/:id
 * Retrieves a single warehouse
 */
warehouseRouter.get(
  "/:id",
  requireAuth,
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const warehouseId = req.params.id as string;
      const warehouse = await getWarehouseById(
        warehouseId,
        req.user!.organizationId!
      );

      if (!warehouse) {
        return res.status(404).json({
          error: "Not Found",
          message: "Warehouse not found.",
        });
      }

      return res.json({ warehouse });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to fetch warehouse",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * PATCH /api/warehouses/:id
 * Admin or Finance/Ops updates warehouse configuration (e.g. shippingCostWeight, name)
 */
warehouseRouter.patch(
  "/:id",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.FINANCE_OPS),
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const warehouseId = req.params.id as string;
      const { name, code, location, shippingCostWeight, isActive } = req.body;

      await updateWarehouse(warehouseId, req.user!.organizationId!, {
        name,
        code,
        location,
        shippingCostWeight: shippingCostWeight !== undefined ? Number(shippingCostWeight) : undefined,
        isActive,
      });

      const updated = await getWarehouseById(
        warehouseId,
        req.user!.organizationId!
      );

      return res.json({
        message: "Warehouse updated successfully.",
        warehouse: updated,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to update warehouse",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * DELETE /api/warehouses/:id
 * Admin deactivates a warehouse
 */
warehouseRouter.delete(
  "/:id",
  requireAuth,
  requireRole(UserRole.ADMIN),
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const warehouseId = req.params.id as string;
      await deleteWarehouse(warehouseId, req.user!.organizationId!);

      return res.json({
        message: "Warehouse deactivated successfully.",
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to delete warehouse",
        message: (error as Error).message,
      });
    }
  }
);
