import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as pricingService from "../services/pricing.service.js";
import * as quotationService from "../services/quotation.service.js";

export const createQuotation = asyncHandler(async (req: TenantRequest, res: Response) => {
  const quotation = await quotationService.createQuotation(
    req.orgId,
    req.user!.id,
    req.user!.role,
    req.body
  );
  return res.status(201).json({ success: true, data: quotation });
});

export const listQuotations = asyncHandler(async (req: TenantRequest, res: Response) => {
  const quotations = await quotationService.listQuotations(
    req.orgId,
    req.user!.id,
    req.user!.role,
    req.query as any
  );
  return res.json({ success: true, data: quotations });
});

export const getQuotation = asyncHandler(async (req: TenantRequest, res: Response) => {
  const quotation = await quotationService.getQuotationById(
    req.orgId,
    req.user!.id,
    req.user!.role,
    req.params.id as string
  );
  return res.json({ success: true, data: quotation });
});

export const addQuotationLine = asyncHandler(async (req: TenantRequest, res: Response) => {
  const updatedQuotation = await quotationService.addQuotationLine(
    req.orgId,
    req.user!.id,
    req.user!.role,
    req.params.id as string,
    req.body
  );
  return res.status(201).json({ success: true, data: updatedQuotation });
});

export const updateQuotationLine = asyncHandler(async (req: TenantRequest, res: Response) => {
  const updatedQuotation = await quotationService.updateQuotationLine(
    req.orgId,
    req.user!.id,
    req.user!.role,
    req.params.id as string,
    req.params.lineId as string,
    req.body
  );
  return res.json({ success: true, data: updatedQuotation });
});

export const deleteQuotationLine = asyncHandler(async (req: TenantRequest, res: Response) => {
  const updatedQuotation = await quotationService.deleteQuotationLine(
    req.orgId,
    req.user!.id,
    req.user!.role,
    req.params.id as string,
    req.params.lineId as string
  );
  return res.json({ success: true, data: updatedQuotation });
});

export const submitQuotation = asyncHandler(async (req: TenantRequest, res: Response) => {
  const submittedQuotation = await quotationService.submitQuotation(
    req.orgId,
    req.user!.id,
    req.user!.role,
    req.params.id as string
  );
  return res.json({ success: true, data: submittedQuotation });
});

export const getUpsellSuggestions = asyncHandler(async (req: TenantRequest, res: Response) => {
  const suggestions = await pricingService.getQuotationUpsellSuggestions(
    req.orgId,
    req.params.id as string
  );
  return res.json({ success: true, data: suggestions });
});
