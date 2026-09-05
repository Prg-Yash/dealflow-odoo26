import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import * as controller from "../controllers/quotation.controller.js";
import { createFulfillmentOrder } from "../controllers/fulfillment.controller.js";
import { confirmQuotation } from "../controllers/billing.controller.js";
import {
  CreateQuotationSchema,
  CreateQuotationLineSchema,
  UpdateQuotationLineSchema,
} from "../schemas/quotation.schema.js";

export const quotationRouter = Router();

quotationRouter.use(requireAuth, tenantMiddleware);

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
  UserRole.FINANCE_OPS,
];

const SALES_ROLES = [
  UserRole.SALES_REP,
  UserRole.SALES_MANAGER,
  UserRole.ADMIN,
];

// Quotation list and details
quotationRouter.get("/", requireRole(...STAFF_ROLES), controller.listQuotations);
quotationRouter.get("/:id", requireRole(...STAFF_ROLES), controller.getQuotation);

// Create draft quotation
quotationRouter.post(
  "/",
  requireRole(...SALES_ROLES),
  validateBody(CreateQuotationSchema),
  controller.createQuotation
);

// Quotation line operations (recomputes margins, overages, and blended risk)
quotationRouter.post(
  "/:id/lines",
  requireRole(...SALES_ROLES),
  validateBody(CreateQuotationLineSchema),
  controller.addQuotationLine
);

quotationRouter.patch(
  "/:id/lines/:lineId",
  requireRole(...SALES_ROLES),
  validateBody(UpdateQuotationLineSchema),
  controller.updateQuotationLine
);

quotationRouter.delete(
  "/:id/lines/:lineId",
  requireRole(...SALES_ROLES),
  controller.deleteQuotationLine
);

// Submit quotation for discount approval evaluation
quotationRouter.post(
  "/:id/submit",
  requireRole(...SALES_ROLES),
  controller.submitQuotation
);

// Pipeline stage updates
quotationRouter.patch(
  "/:id/stage",
  requireRole(...STAFF_ROLES),
  controller.updateQuotationStage
);

// Approval actions (step advancement for Sales Manager and Finance Ops)
quotationRouter.post(
  "/:id/approve",
  requireRole(UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN),
  controller.approveQuotation
);

quotationRouter.post(
  "/:id/reject",
  requireRole(UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN),
  controller.rejectQuotation
);

// Live upsell & cross-sell suggestions panel
quotationRouter.get(
  "/:id/upsell-suggestions",
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  controller.getUpsellSuggestions
);

// Create fulfillment order on APPROVED or CONFIRMED quotation
quotationRouter.post(
  "/:id/fulfillment-orders",
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN, UserRole.SALES_MANAGER),
  createFulfillmentOrder
);

// Confirm quotation: creates Subscription rows for recurring lines + an Invoice for one-time lines
quotationRouter.post(
  "/:id/confirm",
  requireRole(...STAFF_ROLES),
  confirmQuotation
);

