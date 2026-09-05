import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import * as controller from "../controllers/quotation.controller.js";

export const quotationRouter = Router();

quotationRouter.use(requireAuth, tenantMiddleware);

// Live upsell & cross-sell suggestions panel
quotationRouter.get(
  "/:id/upsell-suggestions",
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  controller.getUpsellSuggestions
);
