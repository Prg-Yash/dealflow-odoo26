import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  AssignRepSchema,
  InviteCustomerSchema,
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

// Customer invitation - accessible to SALES_REP, SALES_MANAGER, and ADMIN
customersRouter.post(
  "/invite",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP),
  validateBody(InviteCustomerSchema),
  controller.inviteCustomer
);

// CRUD /customers - read accessible to staff; writes restricted as needed
customersRouter.get("/", requireRole(...STAFF_ROLES), controller.listCustomers);
customersRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP),
  validateBody(CreateCustomerSchema),
  controller.createCustomer
);
customersRouter.get("/:id", requireRole(...STAFF_ROLES), controller.getCustomer);
customersRouter.patch(
  "/:id",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP),
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

