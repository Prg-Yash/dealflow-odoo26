import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as dealHealthService from "../services/deal-health.service.js";
import * as jobService from "../services/job.service.js";

// =============================================================================
// Deal Health Controller
// =============================================================================

export const getStalledQuotations = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await dealHealthService.getStalledQuotations(
      req.orgId,
      req.query as any
    );
    return res.json({
      success: true,
      message: `Found ${result.count} stalled quotation(s) inactive past ${result.thresholdDays} days.`,
      ...result,
    });
  }
);

export const getDiscountAnomalies = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await dealHealthService.getDiscountAnomalies(
      req.orgId,
      req.query as any
    );
    return res.json({
      success: true,
      message: `Found ${result.count} discount anomalie(s) exceeding ${result.multiplier}x rep baseline.`,
      ...result,
    });
  }
);

export const getFulfillmentSlippage = asyncHandler(
  async (req: TenantRequest, res: Response) => {
    const result = await dealHealthService.getFulfillmentSlippage(
      req.orgId,
      req.query as any
    );
    return res.json({
      success: true,
      message: `Found ${result.count} fulfillment order(s) slipping past promised delivery date.`,
      ...result,
    });
  }
);

// =============================================================================
// Background Job Telemetry Controller
// =============================================================================

export const getJobStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await jobService.getJobStatus(req.params.id as string);
    return res.json({
      success: true,
      source: result.source,
      data: result.job,
    });
  }
);
