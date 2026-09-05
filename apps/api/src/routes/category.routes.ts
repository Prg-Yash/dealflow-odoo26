import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import { CreateCategorySchema, UpdateCategorySchema } from "../schemas/category.schema.js";
import * as controller from "../controllers/category.controller.js";

export const categoryRouter = Router();

categoryRouter.use(requireAuth, tenantMiddleware);

categoryRouter.get("/", controller.listCategories);
categoryRouter.get("/:id", controller.getCategory);
categoryRouter.post("/", requireRole(UserRole.ADMIN), validateBody(CreateCategorySchema), controller.createCategory);
categoryRouter.patch("/:id", requireRole(UserRole.ADMIN), validateBody(UpdateCategorySchema), controller.updateCategory);
categoryRouter.delete("/:id", requireRole(UserRole.ADMIN), controller.deleteCategory);
