import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as pricingService from "../services/pricing.service.js";

// Price Lists
export const listPriceLists = asyncHandler(async (req: TenantRequest, res: Response) => {
  const priceLists = await pricingService.listPriceLists(req.orgId);
  return res.json({ success: true, data: priceLists });
});

export const getPriceList = asyncHandler(async (req: TenantRequest, res: Response) => {
  const priceList = await pricingService.getPriceListById(req.orgId, req.params.id as string);
  return res.json({ success: true, data: priceList });
});

export const createPriceList = asyncHandler(async (req: TenantRequest, res: Response) => {
  const priceList = await pricingService.createPriceList(req.orgId, req.body);
  return res.status(201).json({ success: true, data: priceList });
});

export const updatePriceList = asyncHandler(async (req: TenantRequest, res: Response) => {
  const priceList = await pricingService.updatePriceList(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: priceList });
});

export const deletePriceList = asyncHandler(async (req: TenantRequest, res: Response) => {
  await pricingService.deletePriceList(req.orgId, req.params.id as string);
  return res.json({ success: true, data: { message: "Price list deleted successfully." } });
});

// Price List Items
export const addPriceListItem = asyncHandler(async (req: TenantRequest, res: Response) => {
  const item = await pricingService.addPriceListItem(req.orgId, req.params.id as string, req.body);
  return res.status(201).json({ success: true, data: item });
});

export const updatePriceListItem = asyncHandler(async (req: TenantRequest, res: Response) => {
  const item = await pricingService.updatePriceListItem(
    req.orgId,
    req.params.priceListId as string,
    req.params.id as string,
    req.body
  );
  return res.json({ success: true, data: item });
});

export const deletePriceListItem = asyncHandler(async (req: TenantRequest, res: Response) => {
  await pricingService.deletePriceListItem(
    req.orgId,
    req.params.priceListId as string,
    req.params.id as string
  );
  return res.json({ success: true, data: { message: "Price list item deleted successfully." } });
});

// Discount Rules
export const listDiscountRules = asyncHandler(async (req: TenantRequest, res: Response) => {
  const rules = await pricingService.listDiscountRules(req.orgId);
  return res.json({ success: true, data: rules });
});

export const createDiscountRule = asyncHandler(async (req: TenantRequest, res: Response) => {
  const rule = await pricingService.createDiscountRule(req.orgId, req.body);
  return res.status(201).json({ success: true, data: rule });
});

export const updateDiscountRule = asyncHandler(async (req: TenantRequest, res: Response) => {
  const rule = await pricingService.updateDiscountRule(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: rule });
});

export const deleteDiscountRule = asyncHandler(async (req: TenantRequest, res: Response) => {
  await pricingService.deleteDiscountRule(req.orgId, req.params.id as string);
  return res.json({ success: true, data: { message: "Discount approval rule deleted successfully." } });
});

// Product Recommendations
export const listRecommendations = asyncHandler(async (req: TenantRequest, res: Response) => {
  const recs = await pricingService.listRecommendations(req.orgId);
  return res.json({ success: true, data: recs });
});

export const createRecommendation = asyncHandler(async (req: TenantRequest, res: Response) => {
  const rec = await pricingService.createRecommendation(req.orgId, req.body);
  return res.status(201).json({ success: true, data: rec });
});

export const updateRecommendation = asyncHandler(async (req: TenantRequest, res: Response) => {
  const rec = await pricingService.updateRecommendation(req.orgId, req.params.id as string, req.body);
  return res.json({ success: true, data: rec });
});

export const deleteRecommendation = asyncHandler(async (req: TenantRequest, res: Response) => {
  await pricingService.deleteRecommendation(req.orgId, req.params.id as string);
  return res.json({ success: true, data: { message: "Recommendation deleted successfully." } });
});
