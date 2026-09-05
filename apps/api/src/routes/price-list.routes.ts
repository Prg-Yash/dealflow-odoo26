import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import {
  CreatePriceListSchema,
  UpdatePriceListSchema,
  CreatePriceListItemSchema,
  UpdatePriceListItemSchema,
} from "../schemas/pricing.schema.js";
import * as controller from "../controllers/pricing.controller.js";

export const priceListRouter = Router();

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
  UserRole.FINANCE_OPS,
];

priceListRouter.use(requireAuth, tenantMiddleware);

priceListRouter.get("/", requireRole(...STAFF_ROLES), controller.listPriceLists);
priceListRouter.post("/", requireRole(UserRole.ADMIN), validateBody(CreatePriceListSchema), controller.createPriceList);
priceListRouter.get("/:id", requireRole(...STAFF_ROLES), controller.getPriceList);
priceListRouter.patch("/:id", requireRole(UserRole.ADMIN), validateBody(UpdatePriceListSchema), controller.updatePriceList);
priceListRouter.delete("/:id", requireRole(UserRole.ADMIN), controller.deletePriceList);

// Price list items
priceListRouter.post("/:id/items", requireRole(UserRole.ADMIN), validateBody(CreatePriceListItemSchema), controller.addPriceListItem);
priceListRouter.patch("/:priceListId/items/:id", requireRole(UserRole.ADMIN), validateBody(UpdatePriceListItemSchema), controller.updatePriceListItem);
priceListRouter.delete("/:priceListId/items/:id", requireRole(UserRole.ADMIN), controller.deletePriceListItem);
