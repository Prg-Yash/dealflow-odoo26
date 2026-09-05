import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma, UserRole } from "@repo/db";
import { auth } from "../lib/auth.js";
import { ROLE_PERMISSIONS, ROLE_TASKS } from "../config/roles.js";
import { createOrganization } from "../services/organization.service.js";
import { sendResetPasswordEmail } from "../services/email.service.js";
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
      user.customerProfile ||
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
      currency: currency?.trim() || "INR",
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

/**
 * Customer Self-Registration Endpoint (Default Signup)
 * Registers a new user account with CUSTOMER role and links customer profile.
 */
export const registerCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, companyName, phone, billingAddress, shippingAddress } = req.body;

  if (!email || !password || !name) {
    throw new AppError(400, "BAD_REQUEST", "Name, email, and password are required.");
  }

  if (password.length < 8) {
    throw new AppError(400, "BAD_REQUEST", "Password must be at least 8 characters long.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { customerProfile: true },
  });

  let userId: string;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: UserRole.CUSTOMER },
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
      data: { role: UserRole.CUSTOMER },
    });
  }

  // Check if there is an existing customer record matching this email
  let customer = await prisma.customer.findFirst({
    where: { email: normalizedEmail },
  });

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        portalUserId: userId,
        ...(name ? { name: name.trim() } : {}),
        ...(companyName ? { company: companyName.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(billingAddress ? { billingAddress: billingAddress.trim() } : {}),
        ...(shippingAddress ? { shippingAddress: shippingAddress.trim() } : {}),
      },
    });
  } else {
    // If no existing customer record, associate with default/primary organization and its default tier
    const defaultOrg = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
      include: { customerTiers: true },
    });

    if (defaultOrg && defaultOrg.customerTiers.length > 0 && defaultOrg.customerTiers[0]) {
      customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          company: companyName?.trim() || null,
          phone: phone?.trim() || null,
          billingAddress: billingAddress?.trim() || null,
          shippingAddress: shippingAddress?.trim() || null,
          organizationId: defaultOrg.id,
          tierId: defaultOrg.customerTiers[0].id,
          portalUserId: userId,
        },
      });

      // Update user organizationId to match defaultOrg if not yet set
      await prisma.user.update({
        where: { id: userId },
        data: { organizationId: defaultOrg.id },
      });
    }
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { customerProfile: true, organization: true },
  });

  return res.status(201).json({
    message: "Customer account created successfully.",
    user: updatedUser,
    customer,
  });
});

/**
 * Validates a password reset token to ensure it exists and has not expired or been used.
 */
export const verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
  // Prevent browser and proxy caching of verification responses
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const token = (
    (req.query.token as string) ||
    (req.params.token as string) ||
    (req.body?.token as string) ||
    ""
  ).trim();

  if (!token) {
    return res.status(400).json({
      valid: false,
      error: "MISSING_TOKEN",
      message: "Password reset token is missing.",
    });
  }

  const record = await prisma.verification.findFirst({
    where: {
      OR: [
        { identifier: `reset-password:${token}` },
        { value: `reset-password:${token}` },
        { value: token },
        { identifier: token },
      ],
    },
  });

  if (!record) {
    return res.status(400).json({
      valid: false,
      error: "INVALID_OR_USED",
      message: "This password reset link has already been used or does not exist. Please request a new link.",
    });
  }

  if (new Date() > record.expiresAt) {
    // Expired: Clean up stale token from database immediately
    await prisma.verification.delete({ where: { id: record.id } }).catch(() => {});
    return res.status(400).json({
      valid: false,
      error: "EXPIRED",
      message: "This password reset link has expired. For your security, reset links are only valid for a limited time.",
    });
  }

  return res.json({
    valid: true,
    message: "Token is valid and active.",
  });
});

/**
 * Handles password reset: updates user password credentials and permanently expires/deletes the token.
 */
export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const { token, password, newPassword } = req.body;
  const rawToken = (token || "").trim();
  const rawPassword = (newPassword || password || "").trim();

  if (!rawToken) {
    throw new AppError(400, "BAD_REQUEST", "Password reset token is required.");
  }

  if (!rawPassword || rawPassword.length < 8) {
    throw new AppError(400, "BAD_REQUEST", "Password must be at least 8 characters long.");
  }

  // 1. Locate the single-use token in verification table
  const record = await prisma.verification.findFirst({
    where: {
      OR: [
        { identifier: `reset-password:${rawToken}` },
        { value: `reset-password:${rawToken}` },
        { value: rawToken },
        { identifier: rawToken },
      ],
    },
  });

  if (!record) {
    throw new AppError(
      400,
      "INVALID_OR_USED_TOKEN",
      "This password reset link has already been used or has expired. Please request a new recovery link."
    );
  }

  // 2. Enforce strict expiration
  if (new Date() > record.expiresAt) {
    await prisma.verification.delete({ where: { id: record.id } }).catch(() => {});
    throw new AppError(
      400,
      "EXPIRED_TOKEN",
      "This password reset link has expired. Please request a new recovery link."
    );
  }

  // 3. Resolve target user identity
  let targetUser = null;

  // Case A: Better Auth standard - record.value is user.id
  if (record.value && !record.value.includes("@") && !record.value.includes(":")) {
    targetUser = await prisma.user.findUnique({
      where: { id: record.value },
    });
  }

  // Case B: Email stored in identifier or value
  if (!targetUser) {
    const possibleEmail = record.identifier.includes("@")
      ? record.identifier
      : record.value.includes("@")
      ? record.value
      : null;

    if (possibleEmail) {
      targetUser = await prisma.user.findUnique({
        where: { email: possibleEmail.toLowerCase().trim() },
      });
    }
  }

  // Case C: ID in identifier or value
  if (!targetUser) {
    targetUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: record.identifier }, { id: record.value }],
      },
    });
  }

  if (!targetUser) {
    // Delete orphan token
    await prisma.verification.delete({ where: { id: record.id } }).catch(() => {});
    throw new AppError(404, "USER_NOT_FOUND", "No user account found matching this recovery token.");
  }

  // 4. Generate password hash (Better Auth compatible)
  let hashedPassword = "";
  try {
    const { hashPassword } = await import("better-auth/crypto");
    hashedPassword = await hashPassword(rawPassword);
  } catch {
    const cryptoMod = await import("crypto");
    hashedPassword = cryptoMod.createHash("sha256").update(rawPassword).digest("hex");
  }

  // 5. Update or upsert credentials in account table
  const existingAccount = await prisma.account.findFirst({
    where: { userId: targetUser.id, providerId: "credential" },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: hashedPassword },
    });
  } else {
    await prisma.account.create({
      data: {
        id: `acc-${targetUser.id}`,
        accountId: targetUser.id,
        providerId: "credential",
        userId: targetUser.id,
        password: hashedPassword,
      },
    });
  }

  // 6. CRITICAL SECURITY STEP: Permanently delete and invalidate this token and ALL reset tokens for this user
  await prisma.verification.deleteMany({
    where: {
      OR: [
        { id: record.id },
        { identifier: `reset-password:${rawToken}` },
        { value: `reset-password:${rawToken}` },
        { identifier: rawToken },
        { value: rawToken },
        { value: targetUser.id },
        { identifier: targetUser.email.toLowerCase().trim() },
      ],
    },
  }).catch(() => {});

  // 7. Invalidate all active sessions for this user so old sessions cannot persist
  await prisma.session.deleteMany({
    where: { userId: targetUser.id },
  }).catch(() => {});

  console.log(`✓ Password successfully reset for ${targetUser.email}. Reset token permanently deleted and expired.`);

  return res.json({
    success: true,
    message: "Your password has been successfully updated. This reset link is now permanently expired.",
  });
});

/**
 * Initiates a password reset request: generates a single-use token in verification table
 * and dispatches recovery instructions.
 */
export const requestPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, redirectTo } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new AppError(400, "BAD_REQUEST", "A valid email address is required.");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Return success to avoid email enumeration
    return res.json({
      success: true,
      message: "If an account exists with this email, recovery instructions have been sent.",
    });
  }

  // Generate cryptographically secure 24-character token
  const tokenBytes = crypto.randomBytes(18);
  const token = tokenBytes.toString("base64url"); // 24-char URL-safe string
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  // Remove existing pending tokens for this user / email
  await prisma.verification.deleteMany({
    where: {
      OR: [
        { identifier: normalizedEmail },
        { identifier: { startsWith: "reset-password:" }, value: user.id },
        { value: user.id },
        { value: normalizedEmail },
      ],
    },
  }).catch(() => {});

  // Store new token in verification table matching Better Auth's standard pattern
  await prisma.verification.create({
    data: {
      identifier: `reset-password:${token}`,
      value: user.id,
      expiresAt,
    },
  });

  const baseUrl = redirectTo || "http://localhost:3000/reset-password";
  const resetUrl = baseUrl.includes("?")
    ? `${baseUrl}&token=${token}`
    : `${baseUrl}?token=${token}`;

  await sendResetPasswordEmail({
    email: user.email,
    name: user.name,
    url: resetUrl,
    token,
  });

  return res.json({
    success: true,
    message: "Password recovery instructions have been dispatched.",
    token,
  });
});

