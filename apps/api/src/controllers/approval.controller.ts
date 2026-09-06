import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as approvalService from "../services/approval.service.js";

export const approveQuotationStep = asyncHandler(async (req: TenantRequest, res: Response) => {
  const quotationId = (req.params.quotationId || req.params.id) as string;
  const { comments } = req.body || {};

  const updatedQuotation = await approvalService.approveStep({
    quotationId,
    reviewerId: req.user!.id,
    reviewerRole: req.user!.role,
    comments,
  });

  return res.json({
    success: true,
    message: "Quotation step approved successfully.",
    data: updatedQuotation,
  });
});

export const rejectQuotationStep = asyncHandler(async (req: TenantRequest, res: Response) => {
  const quotationId = (req.params.quotationId || req.params.id) as string;
  const { comments, lineAdjustments } = req.body || {};

  const updatedQuotation = await approvalService.rejectStep({
    quotationId,
    reviewerId: req.user!.id,
    reviewerRole: req.user!.role,
    comments,
    lineAdjustments,
  });

  return res.json({
    success: true,
    message: "Quotation step rejected and returned for revision.",
    data: updatedQuotation,
  });
});

export const listPendingApprovals = asyncHandler(async (req: TenantRequest, res: Response) => {
  const approvals = await approvalService.listPendingApprovals(
    req.orgId,
    req.user!.id,
    req.user!.role
  );

  return res.json({
    success: true,
    data: approvals,
  });
});
