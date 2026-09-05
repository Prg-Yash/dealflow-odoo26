import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import { CreateCustomerTierSchema, UpdateCustomerTierSchema } from "../schemas/customer-tier.schema.js";
import * as controller from "../controllers/customer-tier.controller.js";

export const customerTiersRouter = Router();

customerTiersRouter.use(requireAuth, tenantMiddleware, requireRole(UserRole.ADMIN));

customerTiersRouter.get("/", controller.listTiers);
customerTiersRouter.post("/", validateBody(CreateCustomerTierSchema), controller.createTier);
customerTiersRouter.get("/:id", controller.getTier);
customerTiersRouter.patch("/:id", validateBody(UpdateCustomerTierSchema), controller.updateTier);
customerTiersRouter.delete("/:id", controller.deleteTier);
