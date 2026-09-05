import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import {
  CreateDiscountApprovalRuleSchema,
  UpdateDiscountApprovalRuleSchema,
} from "../schemas/pricing.schema.js";
import * as controller from "../controllers/pricing.controller.js";

export const discountRuleRouter = Router();

discountRuleRouter.use(requireAuth, tenantMiddleware);

discountRuleRouter.get("/", requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS), controller.listDiscountRules);
discountRuleRouter.post("/", requireRole(UserRole.ADMIN), validateBody(CreateDiscountApprovalRuleSchema), controller.createDiscountRule);
discountRuleRouter.patch("/:id", requireRole(UserRole.ADMIN), validateBody(UpdateDiscountApprovalRuleSchema), controller.updateDiscountRule);
discountRuleRouter.delete("/:id", requireRole(UserRole.ADMIN), controller.deleteDiscountRule);
