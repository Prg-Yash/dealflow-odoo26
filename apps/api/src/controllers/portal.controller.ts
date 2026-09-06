import type { Request, Response, NextFunction } from "express";
import type { PortalRequest } from "../middleware/portalAuth.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import * as portalService from "../services/portal.service.js";

export async function listActiveQuotations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userEmail = req.user?.email;
    const quotations = await portalService.listActivePortalQuotations(userEmail);
    return res.json({
      success: true,
      data: quotations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuotation(
  req: PortalRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const quotation = await portalService.getPortalQuotation(req.portalToken!);
    return res.json({
      success: true,
      data: quotation,
      ...quotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function postComment(
  req: PortalRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const comment = await portalService.addQuotationComment(
      req.portalToken!,
      req.body
    );
    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

export async function postCounterProposal(
  req: PortalRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const counterProposal = await portalService.submitCounterProposal(
      req.portalToken!,
      req.body
    );
    return res.status(201).json({
      success: true,
      message: "Counter-proposal submitted to sales representative.",
      data: counterProposal,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmQuotation(
  req: PortalRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await portalService.confirmPortalQuotation(
      req.portalToken!,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
      confirmation: result.confirmation,
    });
  } catch (error) {
    next(error);
  }
}

export async function signQuotation(
  req: PortalRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Portal Web Client";

    const result = await portalService.signQuotation(
      req.portalToken!,
      req.body,
      ipAddress,
      userAgent
    );

    return res.status(201).json({
      success: true,
      message: "Quotation signed successfully. Deal confirmed and billing initiated.",
      data: result,
      signature: result.signature,
      confirmation: result.confirmation,
    });
  } catch (error) {
    next(error);
  }
}
