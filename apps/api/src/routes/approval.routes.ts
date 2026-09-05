import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import * as controller from "../controllers/approval.controller.js";

export const approvalRouter = Router();

approvalRouter.use(requireAuth, tenantMiddleware);

const APPROVER_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.FINANCE_OPS,
];

// List pending approvals for current role
approvalRouter.get(
  ["/", "/pending"],
  requireRole(...APPROVER_ROLES),
  controller.listPendingApprovals
);

// Approve active step
approvalRouter.post(
  ["/:id/approve", "/:quotationId/approve"],
  requireRole(...APPROVER_ROLES),
  controller.approveQuotationStep
);

// Reject active step (with optional line discount adjustments)
approvalRouter.post(
  ["/:id/reject", "/:quotationId/reject"],
  requireRole(...APPROVER_ROLES),
  controller.rejectQuotationStep
);
