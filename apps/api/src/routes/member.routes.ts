import { Router, type Request, type Response } from "express";
import { UserRole, prisma } from "@repo/db";
import {
  requireAuth,
  requireRole,
  requireOrg,
  type AuthRequest,
} from "../middleware/auth.middleware.js";
import {
  createInvitation,
  verifyInvitationToken,
  acceptInvitation,
  listInvitations,
  revokeInvitation,
} from "../services/invitation.service.js";

export const memberRouter = Router();

/**
 * POST /api/invitations
 * Admin invites a new member and assigns their role (Sales Rep, Sales Manager, Finance/Ops)
 * and optional role parameters (e.g. managerId, commissionRate, approvalThreshold).
 * Triggers an invitation link sent via SMTP.
 */
memberRouter.post(
  "/invitations",
  requireAuth,
  requireRole(UserRole.ADMIN),
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, role, metadata } = req.body;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({
          error: "Bad Request",
          message: "A valid email address is required.",
        });
      }

      if (!role || !Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          error: "Bad Request",
          message: `Role must be one of: ${Object.values(UserRole).join(", ")}.`,
        });
      }

      const result = await createInvitation({
        email,
        role,
        organizationId: req.user!.organizationId!,
        invitedById: req.user!.id,
        metadata: metadata || {},
      });

      return res.status(201).json({
        message: `Invitation email sent to ${email} for role '${role}'.`,
        invitation: result.invitation,
        inviteUrl: result.inviteUrl,
      });
    } catch (error) {
      return res.status(400).json({
        error: "Failed to create invitation",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/invitations
 * Admin lists all invitations for their organization
 */
memberRouter.get(
  "/invitations",
  requireAuth,
  requireRole(UserRole.ADMIN),
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const invitations = await listInvitations(req.user!.organizationId!);
      return res.json({ invitations });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to list invitations",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * DELETE /api/invitations/:id
 * Admin revokes a pending invitation
 */
memberRouter.delete(
  "/invitations/:id",
  requireAuth,
  requireRole(UserRole.ADMIN),
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const invitationId = req.params.id as string;
      await revokeInvitation(invitationId, req.user!.organizationId!);
      return res.json({ message: "Invitation revoked successfully." });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to revoke invitation",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/invitations/verify
 * Public endpoint: verifies token and returns invitation summary
 */
memberRouter.get("/invitations/verify", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invitation token is required.",
      });
    }

    const invitation = await verifyInvitationToken(token);

    return res.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      currency: invitation.organization.currency,
      invitedBy: invitation.invitedBy.name || invitation.invitedBy.email,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    return res.status(400).json({
      valid: false,
      error: "Verification Failed",
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/invitations/accept
 * Public endpoint: accepts an invitation, sets up user account credentials,
 * assigns the user to the organization, and initializes their designated role profile.
 */
memberRouter.post("/invitations/accept", async (req: Request, res: Response) => {
  try {
    const { token, name, password, userId } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invitation token is required.",
      });
    }

    const result = await acceptInvitation({
      token,
      name,
      password,
      existingUserId: userId,
    });

    return res.json({
      message: "Invitation accepted successfully. Account profile configured.",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.role,
        organizationId: result.organizationId,
      },
    });
  } catch (error) {
    return res.status(400).json({
      error: "Acceptance Failed",
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/members
 * Lists all active members in the current organization with their assigned roles and profiles
 */
memberRouter.get(
  "/members",
  requireAuth,
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.user!.organizationId!;

      const members = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          salesRepProfile: {
            include: {
              manager: {
                select: {
                  id: true,
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
          salesManagerProfile: {
            include: {
              representatives: {
                select: {
                  id: true,
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
          financeOpsProfile: true,
        },
        orderBy: { createdAt: "asc" },
      });

      return res.json({ members });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to list members",
        message: (error as Error).message,
      });
    }
  }
);
