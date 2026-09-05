import type { Response } from "express";
import { prisma } from "@repo/db";
import { asyncHandler, AppError } from "../middleware/error.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  listUserOrganizations,
} from "../services/organization.service.js";

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

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { organizationId: org.id },
  });

  return res.status(201).json({
    message: "Organization created successfully.",
    organization: org,
  });
});

export const getCurrentOrg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const org = await getOrganizationById(req.user!.organizationId!);

  if (!org) {
    throw new AppError(404, "NOT_FOUND", "Organization not found.");
  }

  return res.json({ organization: org });
});

export const listOrgs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizations = await listUserOrganizations(req.user!.id);
  return res.json({ organizations });
});

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
