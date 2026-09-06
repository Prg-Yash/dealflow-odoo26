import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateQuery, validateBody } from "../middleware/validate.js";
import * as controller from "../controllers/deal-health.controller.js";
import {
  QueryStalledDealsSchema,
  QueryAnomaliesSchema,
  QuerySlippageSchema,
  NudgeActionSchema,
} from "../schemas/deal-health.schema.js";

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
  UserRole.FINANCE_OPS,
];

// =============================================================================
// Deal Health Router (/api/deal-health, /deal-health)
// =============================================================================

export const dealHealthRouter = Router();
dealHealthRouter.use(requireAuth, tenantMiddleware);

dealHealthRouter.get(
  "/stalled",
  requireRole(...STAFF_ROLES),
  validateQuery(QueryStalledDealsSchema),
  controller.getStalledQuotations
);

dealHealthRouter.get(
  "/anomalies",
  requireRole(...STAFF_ROLES),
  validateQuery(QueryAnomaliesSchema),
  controller.getDiscountAnomalies
);

dealHealthRouter.get(
  "/slippage",
  requireRole(...STAFF_ROLES),
  validateQuery(QuerySlippageSchema),
  controller.getFulfillmentSlippage
);

dealHealthRouter.post(
  "/:quotationId/nudge",
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  validateBody(NudgeActionSchema),
  controller.nudgeOrEscalate
);

// =============================================================================
// Background Job Status Router (/api/jobs, /jobs)
// =============================================================================

export const jobRouter = Router();
jobRouter.use(requireAuth);

jobRouter.get(
  "/:id",
  requireRole(...STAFF_ROLES),
  controller.getJobStatus
);
