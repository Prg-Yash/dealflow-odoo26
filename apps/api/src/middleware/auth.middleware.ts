import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { prisma, type UserRole, type User, type Organization } from "@repo/db";
import { auth } from "../lib/auth.js";
import { hasPermission, type Permission } from "../config/roles.js";

export interface AuthenticatedUser extends User {
  organization?: Organization | null;
  salesRep?: any | null;
  salesManager?: any | null;
  financeOpsUser?: any | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  session?: any;
}

/**
 * Ensures the incoming request has a valid Better Auth session
 * and loads full user details including role and organization.
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionResult = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionResult?.user) {
      console.log("UNAUTHORIZED")
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to perform this action.",
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionResult.user.id },
      include: {
        organization: true,
        salesRep: true,
        salesManager: true,
        financeOpsUser: true,
      },
    });

    if (!dbUser) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User account no longer exists.",
      });
    }

    req.user = dbUser;
    req.session = sessionResult.session;
    next();
  } catch (error) {
    return res.status(500).json({
      error: "Authentication Error",
      message: (error as Error).message,
    });
  }
}

/**
 * Checks whether the authenticated user has one of the allowed roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Role '${req.user.role}' does not have sufficient permissions to access this resource. Required: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}

/**
 * Checks whether the user's role has a specific capability permission
 */
export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required.",
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Missing required permission: '${permission}' for role '${req.user.role}'.`,
      });
    }

    next();
  };
}

/**
 * Ensures user has an associated organization
 */
export function requireOrg(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.organizationId) {
    return res.status(400).json({
      error: "No Active Organization",
      message: "You must create or join an organization first.",
    });
  }
  next();
}
