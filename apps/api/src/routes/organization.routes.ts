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
  switchOrg,
  updateCurrentOrg,
} from "../controllers/organization.controller.js";

export const organizationRouter = Router();

// Allow any authenticated user to create a new organization
organizationRouter.post("/", requireAuth, createOrg);

// Allow any authenticated user to list their organizations
organizationRouter.get("/", requireAuth, listOrgs);

// Active organization context inspection
organizationRouter.get("/current", requireAuth, requireOrg, getCurrentOrg);

// Switch active organization context
organizationRouter.post("/switch", requireAuth, switchOrg);
organizationRouter.post("/:id/switch", requireAuth, switchOrg);

// Organization configuration updates (ADMIN of current org only)
organizationRouter.patch("/current", requireAuth, requireRole(UserRole.ADMIN), requireOrg, updateCurrentOrg);

