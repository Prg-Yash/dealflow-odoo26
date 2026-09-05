import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import * as controller from "../controllers/billing.controller.js";
import {
  UpdateSubscriptionLineSchema,
  CancelSubscriptionSchema,
  RecordPaymentSchema,
  QueryInvoicesSchema,
  QueryCreditNotesSchema,
} from "../schemas/billing.schema.js";

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
  UserRole.FINANCE_OPS,
];

const FINANCE_ROLES = [
  UserRole.ADMIN,
  UserRole.FINANCE_OPS,
];

const INVOICE_READ_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
  UserRole.FINANCE_OPS,
  UserRole.CUSTOMER,
];

// =============================================================================
// Direct Billing Router (/api/billing, /billing)
// Phase 3: POST /billing/generate
// Phase 3: POST /billing/shipment-invoice
// =============================================================================
export const billingRouter = Router();
billingRouter.use(requireAuth, tenantMiddleware);

billingRouter.post(
  "/generate",
  requireRole(...FINANCE_ROLES),
  controller.generateHybridBilling
);

billingRouter.post(
  "/shipment-invoice",
  requireRole(...FINANCE_ROLES),
  controller.generateShipmentInvoice
);

// =============================================================================
// Subscription Router (/api/subscriptions, /subscriptions)
// =============================================================================
export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth, tenantMiddleware);

subscriptionRouter.get(
  "/",
  requireRole(...STAFF_ROLES),
  controller.listSubscriptions
);

subscriptionRouter.get(
  "/:id",
  requireRole(...STAFF_ROLES),
  controller.getSubscription
);

subscriptionRouter.patch(
  "/:id/lines/:lineId",
  requireRole(...FINANCE_ROLES),
  validateBody(UpdateSubscriptionLineSchema),
  controller.updateSubscriptionLine
);

subscriptionRouter.post(
  "/:id/cancel",
  requireRole(...FINANCE_ROLES),
  validateBody(CancelSubscriptionSchema),
  controller.cancelSubscription
);

// =============================================================================
// Invoice Router (/api/invoices, /invoices)
// =============================================================================
export const invoiceRouter = Router();
invoiceRouter.use(requireAuth, tenantMiddleware);

invoiceRouter.get(
  "/",
  requireRole(...INVOICE_READ_ROLES),
  validateQuery(QueryInvoicesSchema),
  controller.listInvoices
);

invoiceRouter.get(
  "/:id",
  requireRole(...INVOICE_READ_ROLES),
  controller.getInvoice
);

invoiceRouter.post(
  "/:id/payments",
  requireRole(...FINANCE_ROLES),
  validateBody(RecordPaymentSchema),
  controller.recordPayment
);

// =============================================================================
// Credit Note Router (/api/credit-notes, /credit-notes)
// =============================================================================
export const creditNoteRouter = Router();
creditNoteRouter.use(requireAuth, tenantMiddleware);

creditNoteRouter.get(
  "/",
  requireRole(...STAFF_ROLES),
  validateQuery(QueryCreditNotesSchema),
  controller.listCreditNotes
);
