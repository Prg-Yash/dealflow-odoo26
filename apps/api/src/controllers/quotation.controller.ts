import type { Response } from "express";
import { asyncHandler } from "../middleware/error.js";
import type { TenantRequest } from "../middleware/tenant.js";
import * as pricingService from "../services/pricing.service.js";

export const getUpsellSuggestions = asyncHandler(async (req: TenantRequest, res: Response) => {
  const suggestions = await pricingService.getQuotationUpsellSuggestions(
    req.orgId,
    req.params.id as string
  );
  return res.json({ success: true, data: suggestions });
});
