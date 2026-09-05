import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import * as portalService from "../services/portal.service.js";

export async function acceptCounterProposal(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    const result = await portalService.acceptCounterProposal(
      id as string,
      req.user!.id,
      req.user!.role,
      notes
    );

    return res.json({
      success: true,
      message: result.requiresReapproval
        ? "Counter-proposal accepted; re-approval workflow triggered due to discount threshold."
        : "Counter-proposal accepted; quotation updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectCounterProposal(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { responseNotes } = req.body || {};

    const result = await portalService.rejectCounterProposal(
      id as string,
      req.user!.id,
      responseNotes
    );

    return res.json({
      success: true,
      message: "Counter-proposal declined.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
