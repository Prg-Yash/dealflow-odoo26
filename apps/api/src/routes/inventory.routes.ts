import { Router, type Response } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { tenantMiddleware, type TenantRequest } from "../middleware/tenant.js";
import { asyncHandler } from "../middleware/error.js";
import * as fulfillmentService from "../services/fulfillment.service.js";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth, tenantMiddleware);

/**
 * Phase 2: POST /api/inventory/restock
 * Mid-Fulfillment Restock Webhook:
 * Records StockMovement, updatesOnHand, queries active Backorders FIFO,
 * and emits/returns consolidation trigger payload for the frontend.
 */
inventoryRouter.post(
  "/restock",
  requireRole(UserRole.ADMIN, UserRole.FINANCE_OPS),
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const result = await fulfillmentService.processRestockWebhook(
      req.orgId,
      req.body
    );
    return res.status(200).json({ success: true, data: result });
  })
);
