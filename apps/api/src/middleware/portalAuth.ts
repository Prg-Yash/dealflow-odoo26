import type { Request, Response, NextFunction } from "express";
import { prisma, type Quotation, type Customer, type SalesRepresentative, type QuotationLine, QuoteStage } from "@repo/db";
import { AppError } from "./error.js";

export interface PortalQuotation extends Quotation {
  customer: Customer;
  salesRep: SalesRepresentative & { user: { name: string; email: string } };
  lines: QuotationLine[];
}

export interface PortalRequest extends Request {
  quotation?: PortalQuotation;
  portalToken?: string;
}

/**
 * Middleware: portalAuth
 * Authenticates portal customer requests via URL token or header without requiring staff credentials.
 * Rejects if token is missing, not found, or expired.
 */
export async function portalAuth(
  req: PortalRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const bearerHeader =
      typeof req.headers.authorization === "string" &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.slice(7).trim()
        : undefined;

    const token =
      req.params.token ||
      (req.headers["x-portal-token"] as string) ||
      (req.query.token as string) ||
      bearerHeader;

    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Portal authentication token is missing.");
    }

    const quotation = await prisma.quotation.findUnique({
      where: { portalToken: token },
      include: {
        customer: true,
        salesRep: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        lines: {
          orderBy: { sortOrder: "asc" },
        },
        organization: true,
      },
    });

    if (!quotation) {
      console.log("QUOTATION", quotation)
      throw new AppError(404, "NOT_FOUND", "Quotation not found for the provided portal link.");
    }

    const now = new Date();

    // Check portal access expiration if configured
    if (quotation.portalAccessExpiresAt && quotation.portalAccessExpiresAt < now) {
      throw new AppError(410, "PORTAL_EXPIRED", "The customer portal access link for this quotation has expired.");
    }

    // Check deal expiration date
    if (quotation.expiresAt && quotation.expiresAt < now) {
      throw new AppError(410, "QUOTATION_EXPIRED", "This quotation has expired.");
    }

    // Block modifications if quotation is cancelled
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());
    if (isMutation && quotation.stage === QuoteStage.CANCELLED) {
      throw new AppError(400, "QUOTATION_CANCELLED", "This quotation has been cancelled and cannot be modified.");
    }

    req.quotation = quotation as unknown as PortalQuotation;
    req.portalToken = token;
    next();
  } catch (error) {
    next(error);
  }
}
