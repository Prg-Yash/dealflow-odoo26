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

priceListRouter.use(requireAuth, tenantMiddleware, requireRole(UserRole.ADMIN));

priceListRouter.get("/", controller.listPriceLists);
priceListRouter.post("/", validateBody(CreatePriceListSchema), controller.createPriceList);
priceListRouter.get("/:id", controller.getPriceList);
priceListRouter.patch("/:id", validateBody(UpdatePriceListSchema), controller.updatePriceList);
priceListRouter.delete("/:id", controller.deletePriceList);

// Price list items
priceListRouter.post("/:id/items", validateBody(CreatePriceListItemSchema), controller.addPriceListItem);
priceListRouter.patch("/:priceListId/items/:id", validateBody(UpdatePriceListItemSchema), controller.updatePriceListItem);
priceListRouter.delete("/:priceListId/items/:id", controller.deletePriceListItem);
