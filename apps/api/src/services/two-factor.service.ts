import crypto from "crypto";
import { prisma } from "@repo/db";
import { AppError } from "../middleware/error.js";
import {
  generateAndSendWhatsAppOtp,
  verifyWhatsAppOtp,
  normalizePhoneNumber,
  maskPhoneNumber,
} from "./whatsapp.service.js";

export interface User2FAStatus {
  totpEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhoneNumber: string | null;
  whatsappVerified: boolean;
  maskedPhone: string | null;
}

export interface Login2FARequirement {
  requires2FA: boolean;
  userId: string;
  email: string;
  name: string;
  totpEnabled: boolean;
  whatsappEnabled: boolean;
  maskedPhone: string | null;
}

/**
 * Retrieves the comprehensive 2FA status for a user
 */
export async function getUser2FAStatus(userId: string): Promise<User2FAStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      twoFactor: true,
    },
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found.");
  }

  const totpEnabled = Boolean(user.twoFactorEnabled && user.twoFactor.length > 0);
  const whatsappEnabled = Boolean(user.whatsapp2FAEnabled && user.whatsappPhoneNumber);

  return {
    totpEnabled,
    whatsappEnabled,
    whatsappPhoneNumber: user.whatsappPhoneNumber,
    whatsappVerified: user.whatsappVerified,
    maskedPhone: user.whatsappPhoneNumber ? maskPhoneNumber(user.whatsappPhoneNumber) : null,
  };
}

/**
 * Initiates WhatsApp 2FA setup by sending a verification OTP
 */
export async function initiateWhatsAppVerification(userId: string, rawPhone: string) {
  const cleanPhone = normalizePhoneNumber(rawPhone);
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new AppError(400, "INVALID_PHONE", "Please enter a valid phone number with country code.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found.");

  const sendResult = await generateAndSendWhatsAppOtp({
    userId,
    phoneNumber: cleanPhone,
    purpose: "VERIFY_PHONE",
  });

  return {
    success: true,
    message: `Verification OTP sent to +${cleanPhone}`,
    maskedPhone: sendResult.maskedPhone,
    expiresAt: sendResult.expiresAt,
    simulated: sendResult.simulated,
  };
}

/**
 * Confirms OTP and enables WhatsApp 2FA on the user's account
 */
export async function confirmWhatsAppVerification(userId: string, rawPhone: string, otp: string) {
  const cleanPhone = normalizePhoneNumber(rawPhone);

  const verification = await verifyWhatsAppOtp({
    userId,
    otp,
    purpose: "VERIFY_PHONE",
  });

  if (!verification.valid) {
    throw new AppError(400, "INVALID_OTP", "Incorrect or expired WhatsApp verification code.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      whatsappPhoneNumber: cleanPhone,
      whatsappVerified: true,
      whatsapp2FAEnabled: true,
    },
  });

  return {
    success: true,
    message: "WhatsApp 2FA successfully enabled.",
    whatsappPhoneNumber: updatedUser.whatsappPhoneNumber,
    maskedPhone: maskPhoneNumber(updatedUser.whatsappPhoneNumber || cleanPhone),
  };
}

/**
 * Toggles WhatsApp 2FA on or off
 */
export async function toggleWhatsApp2FA(userId: string, enabled: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found.");

  if (enabled && (!user.whatsappPhoneNumber || !user.whatsappVerified)) {
    throw new AppError(
      400,
      "PHONE_NOT_VERIFIED",
      "Please verify your WhatsApp phone number before enabling WhatsApp 2FA."
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      whatsapp2FAEnabled: enabled,
    },
  });

  return {
    success: true,
    whatsapp2FAEnabled: updatedUser.whatsapp2FAEnabled,
    message: enabled ? "WhatsApp 2FA has been activated." : "WhatsApp 2FA has been disabled.",
  };
}

/**
 * Checks if a user attempting to log in requires 2FA and which methods are available
 */
export async function checkLogin2FARequirement(identifier: string): Promise<Login2FARequirement> {
  const normalized = identifier.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { email: normalized }],
    },
    include: {
      twoFactor: true,
    },
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "Account not found.");
  }

  const totpEnabled = Boolean(user.twoFactorEnabled && user.twoFactor.length > 0);
  const whatsappEnabled = Boolean(user.whatsapp2FAEnabled && user.whatsappPhoneNumber);
  const requires2FA = totpEnabled || whatsappEnabled;

  return {
    requires2FA,
    userId: user.id,
    email: user.email,
    name: user.name,
    totpEnabled,
    whatsappEnabled,
    maskedPhone: user.whatsappPhoneNumber ? maskPhoneNumber(user.whatsappPhoneNumber) : null,
  };
}

/**
 * Dispatches a WhatsApp OTP for an active login 2FA challenge
 */
export async function dispatchLoginWhatsAppOtp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found.");
  if (!user.whatsappPhoneNumber || !user.whatsapp2FAEnabled) {
    throw new AppError(400, "NOT_ENABLED", "WhatsApp 2FA is not enabled on this account.");
  }

  const sendResult = await generateAndSendWhatsAppOtp({
    userId,
    phoneNumber: user.whatsappPhoneNumber,
    purpose: "LOGIN_2FA",
  });

  return {
    success: true,
    message: `WhatsApp OTP dispatched to ${sendResult.maskedPhone}`,
    maskedPhone: sendResult.maskedPhone,
    expiresAt: sendResult.expiresAt,
    simulated: sendResult.simulated,
  };
}

/**
 * Verifies a WhatsApp OTP for login and generates an authenticated session token
 */
export async function verifyLoginWhatsAppOtpAndCreateSession({
  userId,
  otp,
  userAgent,
  ipAddress,
}: {
  userId: string;
  otp: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found.");

  const verifyResult = await verifyWhatsAppOtp({
    userId,
    otp,
    purpose: "LOGIN_2FA",
  });

  if (!verifyResult.valid) {
    throw new AppError(400, "INVALID_OTP", "Invalid or expired WhatsApp OTP code.");
  }

  // Generate session in Better Auth session format
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    },
  });

  return {
    success: true,
    sessionToken: session.token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
  };
}
