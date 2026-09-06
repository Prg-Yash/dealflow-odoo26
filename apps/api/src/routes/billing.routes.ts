import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import * as controller from "../controllers/billing.controller.js";
import {
  CreateSubscriptionSchema,
  ModifySubscriptionSchema,
  UpdateSubscriptionLineSchema,
  CancelSubscriptionSchema,
  ScheduleReminderSchema,
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
// Subscription Router (/api/subscriptions, /subscriptions)
// =============================================================================

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth, tenantMiddleware);

subscriptionRouter.get(
  "/",
  requireRole(...STAFF_ROLES),
  controller.listSubscriptions
);

subscriptionRouter.post(
  "/",
  requireRole(...FINANCE_ROLES),
  validateBody(CreateSubscriptionSchema),
  controller.createSubscription
);

subscriptionRouter.get(
  "/:id",
  requireRole(...STAFF_ROLES),
  controller.getSubscription
);

subscriptionRouter.patch(
  "/:id",
  requireRole(...FINANCE_ROLES),
  validateBody(ModifySubscriptionSchema),
  controller.modifySubscription
);

subscriptionRouter.patch(
  "/:id/lines/:lineId",
  requireRole(...FINANCE_ROLES),
  validateBody(UpdateSubscriptionLineSchema),
  controller.updateSubscriptionLine
);

subscriptionRouter.post(
  "/:id/schedule-reminder",
  requireRole(...FINANCE_ROLES),
  validateBody(ScheduleReminderSchema),
  controller.scheduleSubscriptionReminder
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
  requireRole(...FINANCE_ROLES),
  validateQuery(QueryCreditNotesSchema),
  controller.listCreditNotes
);
