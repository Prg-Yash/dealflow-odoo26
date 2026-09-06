import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  get2FAStatusHandler,
  sendWhatsAppVerificationHandler,
  confirmWhatsAppVerificationHandler,
  toggleWhatsApp2FAHandler,
  checkLogin2FAHandler,
  sendLoginWhatsAppOtpHandler,
  verifyLoginWhatsAppOtpHandler,
} from "../controllers/two-factor.controller.js";

export const twoFactorRouter = Router();

// Public 2FA challenge endpoints (used during login)
twoFactorRouter.post("/check", checkLogin2FAHandler);
twoFactorRouter.post("/login/whatsapp/send", sendLoginWhatsAppOtpHandler);
twoFactorRouter.post("/login/whatsapp/verify", verifyLoginWhatsAppOtpHandler);

// Protected endpoints (require authenticated session)
twoFactorRouter.get("/status", requireAuth, get2FAStatusHandler);
twoFactorRouter.post("/whatsapp/send-verification", requireAuth, sendWhatsAppVerificationHandler);
twoFactorRouter.post("/whatsapp/confirm", requireAuth, confirmWhatsAppVerificationHandler);
twoFactorRouter.post("/whatsapp/toggle", requireAuth, toggleWhatsApp2FAHandler);
