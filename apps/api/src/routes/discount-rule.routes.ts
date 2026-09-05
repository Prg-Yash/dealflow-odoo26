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

discountRuleRouter.use(requireAuth, tenantMiddleware, requireRole(UserRole.ADMIN));

discountRuleRouter.get("/", controller.listDiscountRules);
discountRuleRouter.post("/", validateBody(CreateDiscountApprovalRuleSchema), controller.createDiscountRule);
discountRuleRouter.patch("/:id", validateBody(UpdateDiscountApprovalRuleSchema), controller.updateDiscountRule);
discountRuleRouter.delete("/:id", controller.deleteDiscountRule);
