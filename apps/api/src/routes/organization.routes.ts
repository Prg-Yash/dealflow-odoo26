import { Router } from "express";
import { UserRole } from "@repo/db";
import {
  requireAuth,
  requireRole,
  requireOrg,
} from "../middleware/auth.middleware.js";
import {
  createOrg,
  getCurrentOrg,
  listOrgs,
  updateCurrentOrg,
} from "../controllers/organization.controller.js";

export const organizationRouter = Router();

organizationRouter.post("/", requireAuth, requireRole(UserRole.ADMIN), createOrg);
organizationRouter.get("/current", requireAuth, requireOrg, getCurrentOrg);
organizationRouter.get("/", requireAuth, requireRole(UserRole.ADMIN), listOrgs);
organizationRouter.patch("/current", requireAuth, requireRole(UserRole.ADMIN), requireOrg, updateCurrentOrg);
