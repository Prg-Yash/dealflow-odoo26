import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getMe, registerAdmin } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.get("/me", requireAuth, getMe);
authRouter.post("/admin/register", registerAdmin);
