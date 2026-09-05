import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getMe, registerAdmin, registerCustomer } from "../controllers/auth.controller.js";

export const authRouter = Router();

// Current session inspector
authRouter.get("/me", requireAuth, getMe);

// Customer Registration (Default)
authRouter.post("/register", registerCustomer);
authRouter.post("/customer/register", registerCustomer);

// Admin Registration (Workspace Creation)
authRouter.post("/admin/register", registerAdmin);


