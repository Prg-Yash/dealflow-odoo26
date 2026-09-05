import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import { CreateCustomerTierSchema, UpdateCustomerTierSchema } from "../schemas/customer-tier.schema.js";
import * as controller from "../controllers/customer-tier.controller.js";

export const customerTiersRouter = Router();

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
  UserRole.FINANCE_OPS,
];

customerTiersRouter.use(requireAuth, tenantMiddleware);

customerTiersRouter.get("/", requireRole(...STAFF_ROLES), controller.listTiers);
customerTiersRouter.post("/", requireRole(UserRole.ADMIN), validateBody(CreateCustomerTierSchema), controller.createTier);
customerTiersRouter.get("/:id", requireRole(...STAFF_ROLES), controller.getTier);
customerTiersRouter.patch("/:id", requireRole(UserRole.ADMIN), validateBody(UpdateCustomerTierSchema), controller.updateTier);
customerTiersRouter.delete("/:id", requireRole(UserRole.ADMIN), controller.deleteTier);
