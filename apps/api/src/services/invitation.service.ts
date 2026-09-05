import crypto from "crypto";
import { prisma, UserRole, InvitationStatus } from "@repo/db";
import { ENV } from "../config/env.js";
import { sendInvitationEmail } from "./email.service.js";
import { auth } from "../lib/auth.js";

interface CreateInvitationParams {
  email: string;
  role: UserRole;
  organizationId: string;
  invitedById: string;
  metadata?: Record<string, any>;
}

export async function createInvitation({
  email,
  role,
  organizationId,
  invitedById,
  metadata = {},
}: CreateInvitationParams) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      creator: {
        select: { name: true, email: true },
      },
    },
  });

  if (!org) {
    throw new Error("Organization not found.");
  }

  // 2. Fetch inviter info
  const inviter = await prisma.user.findUnique({
    where: { id: invitedById },
    select: { name: true, email: true },
  });

  // 3. Check if user is already a member with this organization
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser && existingUser.organizationId === organizationId) {
    throw new Error(`User with email '${normalizedEmail}' is already an active member of this organization.`);
  }

  // 4. Revoke or mark prior pending invitations for this email + org as EXPIRED
  await prisma.invitation.updateMany({
    where: {
      email: normalizedEmail,
      organizationId,
      status: InvitationStatus.PENDING,
    },
    data: {
      status: InvitationStatus.REVOKED,
    },
  });

  // 5. Generate secure cryptographically random token (64 hex characters)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: {
      email: normalizedEmail,
      role,
      token,
      status: InvitationStatus.PENDING,
      organizationId,
      invitedById,
      metadata,
      expiresAt,
    },
  });

  // 6. Construct invitation URL
  const inviteUrl = `${ENV.WEB_ORIGIN}/invite/accept?token=${token}`;

  // 7. Dispatch invitation email via SMTP
  await sendInvitationEmail({
    email: normalizedEmail,
    organizationName: org.name,
    role,
    inviteUrl,
    inviterName: inviter?.name || "An Administrator",
  });

  return {
    invitation,
    inviteUrl,
  };
}

export async function verifyInvitationToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new Error("Invalid or unrecognized invitation token.");
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new Error(`This invitation has already been ${invitation.status.toLowerCase()}.`);
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.EXPIRED },
    });
    throw new Error("This invitation has expired. Please request a new invitation from your administrator.");
  }

  return invitation;
}

interface AcceptInvitationParams {
  token: string;
  name?: string;
  password?: string;
  existingUserId?: string;
}

export async function acceptInvitation({
  token,
  name,
  password,
  existingUserId,
}: AcceptInvitationParams) {
  const invitation = await verifyInvitationToken(token);
  const metadata = (invitation.metadata as Record<string, any>) || {};

  let targetUserId = existingUserId;

  // If no existing user provided, check if user exists by email
  if (!targetUserId) {
    const existing = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existing) {
      targetUserId = existing.id;
    } else {
      // Must create new user with Better Auth credentials
      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters long for new accounts.");
      }

      const userName = name?.trim() || invitation.email.split("@")[0] || "User";

      // Register new user via Better Auth API
      const authResult = await auth.api.signUpEmail({
        body: {
          email: invitation.email,
          password,
          name: userName,
        },
      });

      if (!authResult || !authResult.user) {
        throw new Error("Failed to create user account with provided credentials.");
      }

      targetUserId = authResult.user.id;
    }
  }

  // Atomic transaction for role profile creation, user assignment, and invitation status
  const finalUserId = targetUserId;
  return await prisma.$transaction(async (tx) => {
    // If role is SALES_REP, enforce valid manager in the same organization
    if (invitation.role === UserRole.SALES_REP) {
      if (!metadata.managerId) {
        throw new Error("A SalesRepresentative must reference an existing SalesManager in the same organization.");
      }
      const manager = await tx.salesManager.findFirst({
        where: {
          id: metadata.managerId,
          organizationId: invitation.organizationId,
        },
      });
      if (!manager) {
        throw new Error("A SalesRepresentative must reference an existing SalesManager in the same organization.");
      }
    }

    // Update user's organization and assigned role
    const updatedUser = await tx.user.update({
      where: { id: finalUserId },
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
        ...(name ? { name: name.trim() } : {}),
      },
    });

    // Provision role-specific profile table
    switch (invitation.role) {
      case UserRole.SALES_REP:
        await tx.salesRepresentative.upsert({
          where: { userId: finalUserId },
          create: {
            userId: finalUserId,
            organizationId: invitation.organizationId,
            managerId: metadata.managerId || null,
            commissionRate: metadata.commissionRate ? Number(metadata.commissionRate) : 0,
            targetQuota: metadata.targetQuota ? Number(metadata.targetQuota) : null,
            historicalAvgDiscount: 0,
          },
          update: {
            organizationId: invitation.organizationId,
            managerId: metadata.managerId || undefined,
            commissionRate: metadata.commissionRate ? Number(metadata.commissionRate) : undefined,
            targetQuota: metadata.targetQuota ? Number(metadata.targetQuota) : undefined,
          },
        });
        break;

      case UserRole.SALES_MANAGER:
        await tx.salesManager.upsert({
          where: { userId: finalUserId },
          create: {
            userId: finalUserId,
            organizationId: invitation.organizationId,
            department: metadata.department || "Sales",
            approvalThreshold: metadata.approvalThreshold ? Number(metadata.approvalThreshold) : null,
          },
          update: {
            organizationId: invitation.organizationId,
            department: metadata.department || undefined,
            approvalThreshold: metadata.approvalThreshold ? Number(metadata.approvalThreshold) : undefined,
          },
        });
        break;

      case UserRole.FINANCE_OPS:
        await tx.financeOpsUser.upsert({
          where: { userId: finalUserId },
          create: {
            userId: finalUserId,
            organizationId: invitation.organizationId,
            department: metadata.department || "Finance & Operations",
            canApproveHighRisk: metadata.canApproveHighRisk ?? true,
            canManageFulfillment: metadata.canManageFulfillment ?? true,
            canManageBilling: metadata.canManageBilling ?? true,
          },
          update: {
            organizationId: invitation.organizationId,
            department: metadata.department || undefined,
            canApproveHighRisk: metadata.canApproveHighRisk ?? true,
            canManageFulfillment: metadata.canManageFulfillment ?? true,
            canManageBilling: metadata.canManageBilling ?? true,
          },
        });
        break;

      case UserRole.CUSTOMER:
        // No staff role profile row for customer portal users
        break;

      default:
        break;
    }

    // Mark invitation as ACCEPTED
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    return {
      user: updatedUser,
      role: invitation.role,
      organizationId: invitation.organizationId,
    };
  });
}

export async function listInvitations(organizationId: string) {
  return prisma.invitation.findMany({
    where: { organizationId },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvitation(id: string, organizationId: string) {
  return prisma.invitation.updateMany({
    where: {
      id,
      organizationId,
      status: InvitationStatus.PENDING,
    },
    data: {
      status: InvitationStatus.REVOKED,
    },
  });
}
