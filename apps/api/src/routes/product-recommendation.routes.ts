import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import {
  CreateProductRecommendationSchema,
  UpdateProductRecommendationSchema,
} from "../schemas/pricing.schema.js";
import * as controller from "../controllers/pricing.controller.js";

export const productRecommendationRouter = Router();

productRecommendationRouter.use(requireAuth, tenantMiddleware);

productRecommendationRouter.get("/", controller.listRecommendations);
productRecommendationRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  validateBody(CreateProductRecommendationSchema),
  controller.createRecommendation
);
productRecommendationRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  validateBody(UpdateProductRecommendationSchema),
  controller.updateRecommendation
);
productRecommendationRouter.delete(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  controller.deleteRecommendation
);
