import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { AppError } from "./error.js";

export interface TenantRequest extends AuthRequest {
  orgId: string;
}

/**
 * Tenant scoping middleware.
 * Ensures the authenticated user belongs to an organization and sets req.orgId.
 * Strict multi-tenant isolation relies on services filtering all queries with this orgId.
 */
export function tenantMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  if (!req.user.organizationId) {
    throw new AppError(
      403,
      "TENANT_REQUIRED",
      "Active organization context required. You must create or join an organization first."
    );
  }

  (req as TenantRequest).orgId = req.user.organizationId;
  next();
}
