import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  AssignRepSchema,
} from "../schemas/customer.schema.js";
import * as controller from "../controllers/customer.controller.js";

export const customersRouter = Router();

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
  UserRole.FINANCE_OPS,
];

// Base middleware: authenticated and scoped to active organization
customersRouter.use(requireAuth, tenantMiddleware);

// CRUD /customers - read accessible to all staff; writes restricted to ADMIN and SALES_MANAGER
customersRouter.get("/", requireRole(...STAFF_ROLES), controller.listCustomers);
customersRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  validateBody(CreateCustomerSchema),
  controller.createCustomer
);
customersRouter.get("/:id", requireRole(...STAFF_ROLES), controller.getCustomer);
customersRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  validateBody(UpdateCustomerSchema),
  controller.updateCustomer
);
customersRouter.delete(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  controller.deleteCustomer
);

// Specific rep reassignment route - SALES_MANAGER, ADMIN
customersRouter.patch(
  "/:id/assign-rep",
  requireRole(UserRole.SALES_MANAGER, UserRole.ADMIN),
  validateBody(AssignRepSchema),
  controller.assignRep
);
