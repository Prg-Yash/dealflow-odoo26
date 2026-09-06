import { type Request, type Response, type NextFunction } from "express";
import {
  getUser2FAStatus,
  initiateWhatsAppVerification,
  confirmWhatsAppVerification,
  toggleWhatsApp2FA,
  checkLogin2FARequirement,
  dispatchLoginWhatsAppOtp,
  verifyLoginWhatsAppOtpAndCreateSession,
} from "../services/two-factor.service.js";
import { AppError } from "../middleware/error.js";

/**
 * GET /api/2fa/status - Get current 2FA settings for authenticated user
 */
export async function get2FAStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
    const status = await getUser2FAStatus(userId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/2fa/whatsapp/send-verification - Send WhatsApp OTP to verify phone number
 */
export async function sendWhatsAppVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      throw new AppError(400, "MISSING_FIELD", "Phone number is required.");
    }
    const result = await initiateWhatsAppVerification(userId, phoneNumber);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/2fa/whatsapp/confirm - Verify OTP and activate WhatsApp 2FA
 */
export async function confirmWhatsAppVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      throw new AppError(400, "MISSING_FIELD", "Phone number and 6-digit OTP code are required.");
    }
    const result = await confirmWhatsAppVerification(userId, phoneNumber, otp);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/2fa/whatsapp/toggle - Enable or disable WhatsApp 2FA
 */
export async function toggleWhatsApp2FAHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      throw new AppError(400, "INVALID_PARAM", "Enabled boolean flag is required.");
    }
    const result = await toggleWhatsApp2FA(userId, enabled);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/2fa/check - Check 2FA requirements before finalizing login
 */
export async function checkLogin2FAHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      throw new AppError(400, "MISSING_IDENTIFIER", "Email or User ID is required.");
    }
    const result = await checkLogin2FARequirement(identifier);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/2fa/login/whatsapp/send - Dispatch WhatsApp OTP during login challenge
 */
export async function sendLoginWhatsAppOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req.body;
    if (!userId) {
      throw new AppError(400, "MISSING_USER_ID", "User ID is required.");
    }
    const result = await dispatchLoginWhatsAppOtp(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/2fa/login/whatsapp/verify - Verify WhatsApp OTP and establish session
 */
export async function verifyLoginWhatsAppOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      throw new AppError(400, "MISSING_FIELDS", "User ID and 6-digit OTP code are required.");
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"] as string;

    const result = await verifyLoginWhatsAppOtpAndCreateSession({
      userId,
      otp,
      userAgent,
      ipAddress,
    });

    // Set standard Better Auth session cookie
    res.cookie("better-auth.session_token", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      data: {
        sessionToken: result.sessionToken,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}
