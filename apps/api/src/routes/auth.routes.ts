import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getMe,
  registerAdmin,
  registerCustomer,
  verifyResetToken,
  resetPasswordHandler,
  requestPasswordResetHandler,
} from "../controllers/auth.controller.js";

export const authRouter = Router();

// Current session inspector
authRouter.get("/me", requireAuth, getMe);

// Customer Registration (Default)
authRouter.post("/register", registerCustomer);
authRouter.post("/customer/register", registerCustomer);

// Admin Registration (Workspace Creation)
authRouter.post("/admin/register", registerAdmin);

// Password Reset Lifecycle Endpoints
authRouter.get("/auth/verify-reset-token", verifyResetToken);
authRouter.get("/verify-reset-token", verifyResetToken);
authRouter.post("/auth/reset-password", resetPasswordHandler);
authRouter.post("/reset-password", resetPasswordHandler);
authRouter.post("/auth/request-password-reset", requestPasswordResetHandler);
authRouter.post("/request-password-reset", requestPasswordResetHandler);


