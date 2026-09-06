import type { Response } from "express";
import { prisma } from "@repo/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  listUserOrganizations,
  switchOrganization,
} from "../services/organization.service.js";

/**
 * Creates a new organization for any authenticated user.
 * The creating user is automatically set as ADMIN of the new organization.
 */
export const createOrg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, slug, currency } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError(400, "BAD_REQUEST", "Organization name is required.");
  }

  const org = await createOrganization({
    name,
    slug,
    currency,
    createdById: req.user!.id,
  });

  return res.status(201).json({
    message: `Organization '${org.name}' created successfully. You are now the Administrator.`,
    organization: org,
    role: "ADMIN",
  });
});

/**
 * Returns current active organization with the user's per-org role context
 */
export const getCurrentOrg = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.organizationId) {
    throw new AppError(400, "NO_ACTIVE_ORG", "No active organization selected.");
  }

  const org = await getOrganizationById(req.user.organizationId, req.user.id);

  if (!org) {
    throw new AppError(404, "NOT_FOUND", "Organization not found.");
  }

  return res.json({ organization: org });
});

/**
 * Lists all organizations the authenticated user has access to,
 * along with their per-organization role and active status.
 */
export const listOrgs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizations = await listUserOrganizations(req.user!.id);
  return res.json({ organizations });
});

/**
 * Switches the user's active organization context.
 */
export const switchOrg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const targetOrgId =
    (req.params.id as string) ||
    (req.body.organizationId as string) ||
    (req.body.id as string);

  if (!targetOrgId || typeof targetOrgId !== "string") {
    throw new AppError(400, "BAD_REQUEST", "Organization ID is required to switch active organization.");
  }

  const result = await switchOrganization(req.user!.id, targetOrgId.trim());

  return res.json(result);
});

/**
 * Updates active organization metadata (Admin only)
 */
export const updateCurrentOrg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, currency, slug } = req.body;
  const updated = await updateOrganization(req.user!.organizationId!, {
    name,
    currency,
    slug,
  });

  return res.json({
    message: "Organization updated successfully.",
    organization: updated,
  });
});

