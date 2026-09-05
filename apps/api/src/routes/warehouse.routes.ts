import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import { CreateWarehouseSchema, UpdateWarehouseSchema } from "../schemas/warehouse.schema.js";
import * as controller from "../controllers/warehouse.controller.js";

export const warehouseRouter = Router();

warehouseRouter.use(requireAuth, tenantMiddleware);

warehouseRouter.get("/", controller.listWarehousesHandler);
warehouseRouter.get("/:id", controller.getWarehouseHandler);
warehouseRouter.post("/", requireRole(UserRole.ADMIN), validateBody(CreateWarehouseSchema), controller.createWarehouseHandler);
warehouseRouter.patch("/:id", requireRole(UserRole.ADMIN, UserRole.FINANCE_OPS), validateBody(UpdateWarehouseSchema), controller.updateWarehouseHandler);
warehouseRouter.delete("/:id", requireRole(UserRole.ADMIN), controller.deleteWarehouseHandler);
