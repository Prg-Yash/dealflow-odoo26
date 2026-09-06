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
  customerProfile?: any | null;
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
      console.warn(`[Auth] 401 Unauthorized request to: ${req.method} ${req.originalUrl || req.url}`);
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to perform this action.",
      });
    }

    let dbUser = await prisma.user.findUnique({
      where: { id: sessionResult.user.id },
      include: {
        organization: true,
        salesRep: true,
        salesManager: true,
        financeOpsUser: true,
        customerProfile: true,
      },
    });

    if (!dbUser) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User account no longer exists.",
      });
    }

    // Auto-resolve organization or sync per-org role from OrganizationMember or profile discovery
    try {
      if (dbUser.organizationId) {
        if ((prisma as any).organizationMember) {
          const memberRecord = await (prisma as any).organizationMember.findUnique({
            where: {
              userId_organizationId: {
                userId: dbUser.id,
                organizationId: dbUser.organizationId,
              },
            },
          });
          if (memberRecord && memberRecord.role && memberRecord.role !== dbUser.role) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: memberRecord.role },
              include: {
                organization: true,
                salesRep: true,
                salesManager: true,
                financeOpsUser: true,
                customerProfile: true,
              },
            });
          }
        }
      } else {
        // If active organizationId is not set, resolve to their first accessible org across all roles
        let resolvedOrgId: string | null = null;
        let resolvedRole: UserRole = UserRole.SALES_REP;

        // 1. OrganizationMember table
        if ((prisma as any).organizationMember) {
          const firstMember = await (prisma as any).organizationMember.findFirst({
            where: { userId: dbUser.id },
            orderBy: { createdAt: "desc" },
          });
          if (firstMember) {
            resolvedOrgId = firstMember.organizationId;
            resolvedRole = firstMember.role;
          }
        }

        // 2. Created Organization (Admin)
        if (!resolvedOrgId) {
          const createdOrg = await prisma.organization.findFirst({
            where: { createdById: dbUser.id },
            orderBy: { createdAt: "desc" },
          });
          if (createdOrg) {
            resolvedOrgId = createdOrg.id;
            resolvedRole = UserRole.ADMIN;
          }
        }

        // 3. Sales Manager Profile
        if (!resolvedOrgId && dbUser.salesManager?.organizationId) {
          resolvedOrgId = dbUser.salesManager.organizationId;
          resolvedRole = UserRole.SALES_MANAGER;
        }

        // 4. Finance Ops Profile
        if (!resolvedOrgId && dbUser.financeOpsUser?.organizationId) {
          resolvedOrgId = dbUser.financeOpsUser.organizationId;
          resolvedRole = UserRole.FINANCE_OPS;
        }

        // 5. Sales Rep Profile
        if (!resolvedOrgId && dbUser.salesRep?.organizationId) {
          resolvedOrgId = dbUser.salesRep.organizationId;
          resolvedRole = UserRole.SALES_REP;
        }

        // 6. Invitations by email
        if (!resolvedOrgId && dbUser.email) {
          const invite = await prisma.invitation.findFirst({
            where: {
              email: { equals: dbUser.email.trim(), mode: "insensitive" },
            },
            orderBy: { createdAt: "desc" },
          });
          if (invite) {
            resolvedOrgId = invite.organizationId;
            resolvedRole = invite.role;
          }
        }

        // 7. Organizations user is connected to
        if (!resolvedOrgId) {
          const connectedOrg = await prisma.organization.findFirst({
            where: { users: { some: { id: dbUser.id } } },
            orderBy: { createdAt: "desc" },
          });
          if (connectedOrg) {
            resolvedOrgId = connectedOrg.id;
            resolvedRole = dbUser.role || UserRole.SALES_REP;
          }
        }

        if (resolvedOrgId) {
          // Upsert OrganizationMember
          try {
            if ((prisma as any).organizationMember) {
              await (prisma as any).organizationMember.upsert({
                where: {
                  userId_organizationId: {
                    userId: dbUser.id,
                    organizationId: resolvedOrgId,
                  },
                },
                create: {
                  userId: dbUser.id,
                  organizationId: resolvedOrgId,
                  role: resolvedRole,
                },
                update: {
                  role: resolvedRole,
                },
              });
            }
          } catch {}

          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              organizationId: resolvedOrgId,
              role: resolvedRole,
            },
            include: {
              organization: true,
              salesRep: true,
              salesManager: true,
              financeOpsUser: true,
              customerProfile: true,
            },
          });
        }
      }
    } catch (syncErr) {
      // Non-blocking sync note
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

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required.",
      });
    }

    if (req.user.role !== "ADMIN" && !allowedRoles.includes(req.user.role)) {
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
