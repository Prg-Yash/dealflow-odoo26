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
  resendInvitation as resendInvitationService,
} from "../services/invitation.service.js";

export const createInvitation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, role, metadata, department, territory, expiryDays } = req.body;

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

  // Merge top-level department/territory into metadata so the frontend's
  // flat shape ({ email, role, department, territory, expiryDays }) is
  // compatible with the service's metadata-based contract.
  const mergedMetadata: Record<string, any> = { ...(metadata || {}) };
  if (department) mergedMetadata.department = department;
  if (territory) mergedMetadata.territory = territory;
  if (expiryDays !== undefined) mergedMetadata.expiryDays = expiryDays;

  const result = await createInvitationService({
    email,
    role,
    organizationId: req.user!.organizationId!,
    invitedById: req.user!.id,
    metadata: mergedMetadata,
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

export const resendInvitation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invitationId = req.params.id as string;
  const result = await resendInvitationService(invitationId, req.user!.organizationId!);
  return res.json({
    message: `Invitation resent successfully to ${result.invitation.email}.`,
    invitation: result.invitation,
    inviteUrl: result.inviteUrl,
  });
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

  // 1. Fetch organization with creator details
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      createdById: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  // 2. Fetch all OrganizationMember entries for this organization
  let orgMembers: any[] = [];
  try {
    if ((prisma as any).organizationMember) {
      orgMembers = await (prisma as any).organizationMember.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              createdAt: true,
              salesRep: {
                include: {
                  manager: {
                    select: {
                      id: true,
                      user: { select: { name: true, email: true } },
                    },
                  },
                },
              },
              salesManager: {
                include: {
                  reps: {
                    select: {
                      id: true,
                      user: { select: { name: true, email: true } },
                    },
                  },
                },
              },
              financeOpsUser: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }
  } catch (err) {
    console.warn("[MemberController] Note on OrganizationMember list query:", err);
  }

  // 3. Fallback/compatibility query for users associated directly via User.organizationId
  const directUsers = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      role: { not: UserRole.CUSTOMER },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      salesRep: {
        include: {
          manager: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
      salesManager: {
        include: {
          reps: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
      financeOpsUser: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // 3b. Query role-specific profile tables tied to this organization
  let roleProfileUsers: any[] = [];
  try {
    const [reps, managers, financeUsers] = await Promise.all([
      prisma.salesRepresentative.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
          },
          manager: { select: { id: true, user: { select: { name: true, email: true } } } },
        },
      }),
      prisma.salesManager.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
          },
          reps: { select: { id: true, user: { select: { name: true, email: true } } } },
        },
      }),
      prisma.financeOpsUser.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
          },
        },
      }),
    ]);

    reps.forEach((r) => {
      if (r.user) {
        roleProfileUsers.push({
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
          image: r.user.image,
          role: UserRole.SALES_REP,
          createdAt: r.user.createdAt,
          salesRep: r,
        });
      }
    });

    managers.forEach((m) => {
      if (m.user) {
        roleProfileUsers.push({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          role: UserRole.SALES_MANAGER,
          createdAt: m.user.createdAt,
          salesManager: m,
        });
      }
    });

    financeUsers.forEach((f) => {
      if (f.user) {
        roleProfileUsers.push({
          id: f.user.id,
          name: f.user.name,
          email: f.user.email,
          image: f.user.image,
          role: UserRole.FINANCE_OPS,
          createdAt: f.user.createdAt,
          financeOpsUser: f,
        });
      }
    });
  } catch (profileErr) {
    console.warn("[MemberController] Role profile merge note:", profileErr);
  }

  // 4. Merge and deduplicate members
  const memberMap = new Map<string, any>();

  // Add creator if not present
  if (org?.creator) {
    memberMap.set(org.creator.id, {
      id: org.creator.id,
      name: org.creator.name,
      email: org.creator.email,
      image: org.creator.image,
      role: UserRole.ADMIN,
      isCreator: true,
      createdAt: org.creator.createdAt,
    });
  }

  // Add members from OrganizationMember
  orgMembers.forEach((om) => {
    if (om.user) {
      const isCreator = org?.createdById === om.user.id;
      memberMap.set(om.user.id, {
        id: om.user.id,
        name: om.user.name,
        email: om.user.email,
        image: om.user.image,
        role: isCreator ? UserRole.ADMIN : om.role,
        isCreator,
        createdAt: om.createdAt || om.user.createdAt,
        salesRep: om.user.salesRep,
        salesManager: om.user.salesManager,
        financeOpsUser: om.user.financeOpsUser,
      });
    }
  });

  // Add direct users if not already added
  directUsers.forEach((u) => {
    if (!memberMap.has(u.id)) {
      const isCreator = org?.createdById === u.id;
      memberMap.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: isCreator ? UserRole.ADMIN : u.role,
        isCreator,
        createdAt: u.createdAt,
        salesRep: u.salesRep,
        salesManager: u.salesManager,
        financeOpsUser: u.financeOpsUser,
      });
    }
  });

  // Add role profile users if not already added
  roleProfileUsers.forEach((rpu) => {
    if (!memberMap.has(rpu.id)) {
      const isCreator = org?.createdById === rpu.id;
      memberMap.set(rpu.id, {
        ...rpu,
        role: isCreator ? UserRole.ADMIN : rpu.role,
        isCreator,
      });
    }
  });

  const members = Array.from(memberMap.values());

  return res.json({ members });
});

/**
 * Updates a member's role within the organization (Admin only)
 */
export const updateMemberRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const targetUserId = req.params.userId || req.body.userId;
  const { role } = req.body;

  if (!targetUserId) {
    throw new AppError(400, "BAD_REQUEST", "Target user ID is required.");
  }

  if (!role || !Object.values(UserRole).includes(role)) {
    throw new AppError(400, "BAD_REQUEST", `Invalid role. Must be one of: ${Object.values(UserRole).join(", ")}`);
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (org?.createdById === targetUserId && role !== UserRole.ADMIN) {
    throw new AppError(400, "CANNOT_DEMOTE_CREATOR", "The organization creator must retain the ADMIN role.");
  }

  // 1. Update OrganizationMember role
  try {
    if ((prisma as any).organizationMember) {
      await (prisma as any).organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId: orgId,
          },
        },
        create: {
          userId: targetUserId,
          organizationId: orgId,
          role,
        },
        update: {
          role,
        },
      });
    }
  } catch (err) {
    console.warn("[MemberController] Note on update member role:", err);
  }

  // 2. If this org is the user's currently active org, update their user.role as well
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (targetUser && targetUser.organizationId === orgId) {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });
  }

  return res.json({
    message: `Member role updated to '${role}' successfully.`,
    userId: targetUserId,
    role,
  });
});

/**
 * Removes a member from the organization (Admin only)
 */
export const removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.organizationId!;
  const targetUserId = req.params.userId || req.body.userId;

  if (!targetUserId) {
    throw new AppError(400, "BAD_REQUEST", "Target user ID is required.");
  }

  if (req.user!.id === targetUserId) {
    throw new AppError(400, "CANNOT_REMOVE_SELF", "You cannot remove yourself from the organization.");
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (org?.createdById === targetUserId) {
    throw new AppError(400, "CANNOT_REMOVE_CREATOR", "The organization creator cannot be removed.");
  }

  // 1. Delete from OrganizationMember table
  try {
    if ((prisma as any).organizationMember) {
      await (prisma as any).organizationMember.deleteMany({
        where: {
          userId: targetUserId,
          organizationId: orgId,
        },
      });
    }
  } catch (err) {
    console.warn("[MemberController] Note on delete member:", err);
  }

  // 2. If this was the user's active organization, find another org or reset
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (targetUser && targetUser.organizationId === orgId) {
    let nextOrgId: string | null = null;
    let nextRole: UserRole = UserRole.CUSTOMER;

    try {
      if ((prisma as any).organizationMember) {
        const otherMembership = await (prisma as any).organizationMember.findFirst({
          where: { userId: targetUserId, organizationId: { not: orgId } },
        });
        if (otherMembership) {
          nextOrgId = otherMembership.organizationId;
          nextRole = otherMembership.role;
        }
      }
    } catch {}

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        organizationId: nextOrgId,
        role: nextRole,
      },
    });
  }

  return res.json({
    message: "Member removed from organization successfully.",
    userId: targetUserId,
  });
});

