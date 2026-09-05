import { Router, type Response } from "express";
import { prisma, UserRole } from "@repo/db";
import { auth } from "../lib/auth.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.middleware.js";
import { ROLE_PERMISSIONS, ROLE_TASKS } from "../config/roles.js";
import { createOrganization } from "../services/organization.service.js";

export const authRouter = Router();

/**
 * Enhanced Authenticated Session Inspector
 * Returns user identity, assigned role, active organization, role profile,
 * and computed operational rights/tasks from the DealFlow360 platform specification.
 */
authRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
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
      user.salesRepProfile ||
      user.salesManagerProfile ||
      user.financeOpsProfile ||
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
authRouter.post("/admin/register", async (req, res) => {
  try {
    const { name, email, password, organizationName, currency } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Password must be at least 8 characters long.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let userId: string;

    if (existing) {
      // Promote existing user to ADMIN
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: UserRole.ADMIN },
      });
      userId = existing.id;
    } else {
      // Create user via Better Auth
      const authResult = await auth.api.signUpEmail({
        body: {
          email: normalizedEmail,
          password,
          name: name.trim(),
        },
      });

      if (!authResult?.user) {
        return res.status(500).json({
          error: "Registration Failed",
          message: "Could not create user credentials.",
        });
      }

      userId = authResult.user.id;

      // Update role to ADMIN
      await prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.ADMIN },
      });
    }

    // If an organization name was provided, create the organization
    let organization = null;
    if (organizationName?.trim()) {
      organization = await createOrganization({
        name: organizationName.trim(),
        currency: currency?.trim() || "USD",
        createdById: userId,
      });

      // Link admin to the organization
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
  } catch (error) {
    return res.status(500).json({
      error: "Admin Registration Failed",
      message: (error as Error).message,
    });
  }
});
