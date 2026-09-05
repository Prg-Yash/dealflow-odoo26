import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as tierService from "../services/customer-tier.service.js";

export const listTiers = asyncHandler(async (req: TenantRequest, res: Response) => {
  const tiers = await tierService.listTiers(req.orgId);
  return res.json({ success: true, data: tiers });
});

export const getTier = asyncHandler(async (req: TenantRequest, res: Response) => {
  const tier = await tierService.getTierById(req.orgId, req.params.id as string);
  return res.json({ success: true, data: tier });
});

export const createTier = asyncHandler(async (req: TenantRequest, res: Response) => {
  const tier = await tierService.createTier(req.orgId, req.body);
  return res.status(201).json({ success: true, data: tier });
});

export const updateTier = asyncHandler(async (req: TenantRequest, res: Response) => {
  const tier = await tierService.updateTier(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: tier });
});

export const deleteTier = asyncHandler(async (req: TenantRequest, res: Response) => {
  await tierService.deleteTier(req.orgId, req.params.id as string);
  return res.json({ success: true, data: { message: "Customer tier deleted successfully." } });
});
