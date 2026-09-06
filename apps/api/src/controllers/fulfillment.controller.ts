import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as fulfillmentService from "../services/fulfillment.service.js";

export const createFulfillmentOrder = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const order = await fulfillmentService.createFulfillmentOrder(
      req.orgId,
      req.params.id as string,
      req.body
    );
    return res.status(201).json({ success: true, data: order });
  }
);

export const listFulfillmentOrders = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const orders = await fulfillmentService.listFulfillmentOrders(
      req.orgId,
      req.query as any
    );
    return res.json({ success: true, data: orders });
  }
);

export const getFulfillmentOrder = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const order = await fulfillmentService.getFulfillmentOrderById(
      req.orgId,
      req.params.id as string
    );
    return res.json({ success: true, data: order });
  }
);

export const previewSplit = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const preview = await fulfillmentService.previewSplit(
      req.orgId,
      req.params.id as string
    );
    return res.json({ success: true, data: preview });
  }
);

export const acceptSplit = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const order = await fulfillmentService.acceptSplit(
      req.orgId,
      req.params.id as string
    );
    return res.json({ success: true, data: order });
  }
);

export const updateShipmentStatus = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const shipment = await fulfillmentService.updateShipmentStatus(
      req.orgId,
      req.params.id as string,
      req.body
    );
    return res.json({ success: true, data: shipment });
  }
);

export const consolidateBackorder = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await fulfillmentService.consolidateBackorder(
      req.orgId,
      req.params.id as string
    );
    return res.json({ success: true, data: result });
  }
);

/**
 * Phase 1: POST /api/fulfillment/auto-split
 * Waterfall allocation engine for confirmed quotations
 */
export const autoSplit = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await fulfillmentService.autoSplitFulfillment(
      req.orgId,
      req.body
    );
    return res.status(200).json({ success: true, data: result });
  }
);

/**
 * Phase 2: POST /api/fulfillment/override
 * Manual adjustment of shipment line with strict stock validation
 */
export const manualOverride = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await fulfillmentService.manualOverrideShipmentLine(
      req.orgId,
      req.body
    );
    return res.status(200).json({ success: true, data: result });
  }
);
