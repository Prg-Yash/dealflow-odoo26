import { Router } from "express";
import { UserRole } from "@repo/db";
import {
  requireAuth,
  requireRole,
  requireOrg,
} from "../middleware/auth.middleware.js";
import {
  createWarehouseHandler,
  listWarehousesHandler,
  getWarehouseHandler,
  updateWarehouseHandler,
  deleteWarehouseHandler,
} from "../controllers/warehouse.controller.js";

export const warehouseRouter = Router();

warehouseRouter.post("/", requireAuth, requireRole(UserRole.ADMIN), requireOrg, createWarehouseHandler);
warehouseRouter.get("/", requireAuth, requireOrg, listWarehousesHandler);
warehouseRouter.get("/:id", requireAuth, requireOrg, getWarehouseHandler);
warehouseRouter.patch("/:id", requireAuth, requireRole(UserRole.ADMIN, UserRole.FINANCE_OPS), requireOrg, updateWarehouseHandler);
warehouseRouter.delete("/:id", requireAuth, requireRole(UserRole.ADMIN), requireOrg, deleteWarehouseHandler);
