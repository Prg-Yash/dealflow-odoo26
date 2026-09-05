import type { Request, Response } from "express";
import { UserRole, prisma } from "@repo/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createInvitation as createInvitationService,
  verifyInvitationToken,
  acceptInvitation as acceptInvitationService,
  listInvitations as listInvitationsService,
  revokeInvitation as revokeInvitationService,
} from "../services/invitation.service.js";

export const createInvitation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, role, metadata } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new AppError(400, "BAD_REQUEST", "A valid email address is required.");
  }

  if (!role || !Object.values(UserRole).includes(role)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `Role must be one of: ${Object.values(UserRole).join(", ")}.`
    );
  }

  const result = await createInvitationService({
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
});

export const listInvitations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invitations = await listInvitationsService(req.user!.organizationId!);
  return res.json({ invitations });
});

export const revokeInvitation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invitationId = req.params.id as string;
  await revokeInvitationService(invitationId, req.user!.organizationId!);
  return res.json({ message: "Invitation revoked successfully." });
});

export const verifyInvitation = asyncHandler(async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    throw new AppError(400, "BAD_REQUEST", "Invitation token is required.");
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
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.params.token as string) || (req.body.token as string);

  if (!token) {
    throw new AppError(400, "BAD_REQUEST", "Invitation token is required.");
  }

  const { name, password, userId } = req.body;

  const result = await acceptInvitationService({
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
});

export const listMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
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
});
