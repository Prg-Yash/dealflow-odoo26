import type { Request, Response } from "express";
import { prisma, UserRole } from "@repo/db";
import { auth } from "../lib/auth.js";
import { ROLE_PERMISSIONS, ROLE_TASKS } from "../config/roles.js";
import { createOrganization } from "../services/organization.service.js";
import { asyncHandler, AppError } from "../middleware/error.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

/**
 * Enhanced Authenticated Session Inspector
 * Returns user identity, assigned role, active organization, role profile,
 * and computed operational rights/tasks.
 */
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const role = user.role;
  const permissions = ROLE_PERMISSIONS[role] || [];
  const tasksInfo = ROLE_TASKS[role] || { title: role, tasks: [] };

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified,
      organizationId: user.organizationId,
      organization: user.organization,
      createdAt: user.createdAt,
    },
    profile:
      user.salesRep ||
      user.salesManager ||
      user.financeOpsUser ||
      null,
    capabilities: {
      roleTitle: tasksInfo.title,
      permissions,
      tasks: tasksInfo.tasks,
    },
  });
});

/**
 * Admin Self-Registration / Onboarding Endpoint
 * Registers an initial administrator account and creates their initial Organization.
 */
export const registerAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, organizationName, currency } = req.body;

  if (!email || !password || !name) {
    throw new AppError(400, "BAD_REQUEST", "Name, email, and password are required.");
  }

  if (password.length < 8) {
    throw new AppError(400, "BAD_REQUEST", "Password must be at least 8 characters long.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  let userId: string;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: UserRole.ADMIN },
    });
    userId = existing.id;
  } else {
    const authResult = await auth.api.signUpEmail({
      body: {
        email: normalizedEmail,
        password,
        name: name.trim(),
      },
    });

    if (!authResult?.user) {
      throw new AppError(500, "REGISTRATION_FAILED", "Could not create user credentials.");
    }

    userId = authResult.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.ADMIN },
    });
  }

  let organization = null;
  if (organizationName?.trim()) {
    organization = await createOrganization({
      name: organizationName.trim(),
      currency: currency?.trim() || "USD",
      createdById: userId,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { organizationId: organization.id },
    });
  }

  const updatedAdmin = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  return res.status(201).json({
    message: "Administrator account created successfully.",
    user: updatedAdmin,
    organization,
  });
});
