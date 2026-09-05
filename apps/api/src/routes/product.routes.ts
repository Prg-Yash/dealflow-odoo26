import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateProductVariantSchema,
  UpdateProductVariantSchema,
  EffectivePriceQuerySchema,
} from "../schemas/product.schema.js";
import * as controller from "../controllers/product.controller.js";

export const productRouter = Router();

productRouter.use(requireAuth, tenantMiddleware);

// Effective Price calculation — accessible to any authenticated staff
productRouter.get("/:id/effective-price", validateQuery(EffectivePriceQuerySchema), controller.getEffectivePrice);

// Product Catalog CRUD — read accessible to staff, writes require ADMIN
productRouter.get("/", controller.listProducts);
productRouter.get("/:id", controller.getProduct);
productRouter.post("/", requireRole(UserRole.ADMIN), validateBody(CreateProductSchema), controller.createProduct);
productRouter.patch("/:id", requireRole(UserRole.ADMIN), validateBody(UpdateProductSchema), controller.updateProduct);
productRouter.delete("/:id", requireRole(UserRole.ADMIN), controller.deleteProduct);

// Product Variants
productRouter.get("/:id/variants", controller.listVariants);
productRouter.post("/:id/variants", requireRole(UserRole.ADMIN), validateBody(CreateProductVariantSchema), controller.createVariant);
productRouter.patch("/:id/variants/:variantId", requireRole(UserRole.ADMIN), validateBody(UpdateProductVariantSchema), controller.updateVariant);
productRouter.delete("/:id/variants/:variantId", requireRole(UserRole.ADMIN), controller.deleteVariant);
