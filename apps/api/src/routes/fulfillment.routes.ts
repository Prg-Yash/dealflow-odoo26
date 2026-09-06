import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { validateBody } from "../middleware/validate.js";
import * as controller from "../controllers/fulfillment.controller.js";
import { UpdateShipmentStatusSchema } from "../schemas/fulfillment.schema.js";

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.FINANCE_OPS,
  UserRole.SALES_MANAGER,
  UserRole.SALES_REP,
];

const FINANCE_ADMIN_ROLES = [UserRole.ADMIN, UserRole.FINANCE_OPS];

// =============================================================================
// Direct Fulfillment Router (/fulfillment)
// Phase 1: POST /fulfillment/auto-split
// Phase 2: POST /fulfillment/override
// =============================================================================
export const fulfillmentRouter = Router();
fulfillmentRouter.use(requireAuth, tenantMiddleware);

fulfillmentRouter.post(
  "/auto-split",
  requireRole(...STAFF_ROLES),
  controller.autoSplit
);

fulfillmentRouter.post(
  "/override",
  requireRole(...FINANCE_ADMIN_ROLES),
  controller.manualOverride
);

// =============================================================================
// Fulfillment Order Router (/fulfillment-orders)
// =============================================================================
export const fulfillmentOrderRouter = Router();
fulfillmentOrderRouter.use(requireAuth, tenantMiddleware);

fulfillmentOrderRouter.get(
  "/",
  requireRole(...STAFF_ROLES),
  controller.listFulfillmentOrders
);

fulfillmentOrderRouter.get(
  "/:id",
  requireRole(...STAFF_ROLES),
  controller.getFulfillmentOrder
);

// Preview greedy split across warehouses without committing changes
fulfillmentOrderRouter.get(
  "/:id/split-preview",
  requireRole(...STAFF_ROLES),
  controller.previewSplit
);

// Commit split, create shipments and backorders, reserve warehouse stock
fulfillmentOrderRouter.post(
  "/:id/accept-split",
  requireRole(...FINANCE_ADMIN_ROLES),
  controller.acceptSplit
);

// Auto-split direct trigger on a fulfillment order
fulfillmentOrderRouter.post(
  "/:id/auto-split",
  requireRole(...STAFF_ROLES),
  async (req, res, next) => {
    req.body = { ...req.body, fulfillmentOrderId: req.params.id };
    controller.autoSplit(req, res, next);
  }
);

// =============================================================================
// Shipment Router (/shipments)
// =============================================================================
export const shipmentRouter = Router();
shipmentRouter.use(requireAuth, tenantMiddleware);

// Walk PENDING -> PICKED -> PACKED -> SHIPPED (deducts on-hand) -> DELIVERED
shipmentRouter.patch(
  "/:id/status",
  requireRole(...FINANCE_ADMIN_ROLES),
  validateBody(UpdateShipmentStatusSchema),
  controller.updateShipmentStatus
);

// =============================================================================
// Backorder Router (/backorders)
// =============================================================================
export const backorderRouter = Router();
backorderRouter.use(requireAuth, tenantMiddleware);

// Re-run split after restock
backorderRouter.post(
  "/:id/consolidate",
  requireRole(...FINANCE_ADMIN_ROLES),
  controller.consolidateBackorder
);
