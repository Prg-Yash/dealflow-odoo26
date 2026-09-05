import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  AdjustStockSchema,
  DirectAdjustStockSchema,
  StockLevelQuerySchema,
} from "../schemas/warehouse.schema.js";
import * as controller from "../controllers/warehouse.controller.js";

export const stockLevelRouter = Router();

stockLevelRouter.use(requireAuth, tenantMiddleware);

// Stock queries — accessible to authenticated staff
stockLevelRouter.get("/movements", controller.listStockMovements);
stockLevelRouter.get("/", validateQuery(StockLevelQuerySchema), controller.listStockLevels);
stockLevelRouter.get("/:id", controller.getStockLevel);
stockLevelRouter.get("/:id/available", controller.getStockAvailable);

// Stock adjustment — restricted to ADMIN and FINANCE_OPS
stockLevelRouter.post(
  "/adjust",
  requireRole(UserRole.ADMIN, UserRole.FINANCE_OPS),
  validateBody(DirectAdjustStockSchema),
  controller.directAdjustStock
);

stockLevelRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.FINANCE_OPS),
  validateBody(AdjustStockSchema),
  controller.manualAdjustStock
);
