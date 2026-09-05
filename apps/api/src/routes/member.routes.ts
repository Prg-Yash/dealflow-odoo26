import { Router } from "express";
import { UserRole } from "@repo/db";
import {
  requireAuth,
  requireRole,
  requireOrg,
} from "../middleware/auth.middleware.js";
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation,
  listMembers,
} from "../controllers/member.controller.js";

export const memberRouter = Router();

// Invitation management (ADMIN only)
memberRouter.post("/invitations", requireAuth, requireRole(UserRole.ADMIN), requireOrg, createInvitation);
memberRouter.get("/invitations", requireAuth, requireRole(UserRole.ADMIN), requireOrg, listInvitations);
memberRouter.delete("/invitations/:id", requireAuth, requireRole(UserRole.ADMIN), requireOrg, revokeInvitation);

// Public invitation verification and acceptance
memberRouter.get("/invitations/verify", verifyInvitation);
memberRouter.post(["/invitations/accept", "/invitations/:token/accept"], acceptInvitation);

// Organization member roster
memberRouter.get("/members", requireAuth, requireOrg, listMembers);
