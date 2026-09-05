import { Router, type Response } from "express";
import { UserRole, prisma } from "@repo/db";
import {
  requireAuth,
  requireRole,
  requireOrg,
  type AuthRequest,
} from "../middleware/auth.middleware.js";
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  listUserOrganizations,
} from "../services/organization.service.js";

export const organizationRouter = Router();

/**
 * POST /api/organizations
 * Admin creates a new Organization
 */
organizationRouter.post(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, slug, currency } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Organization name is required.",
        });
      }

      const org = await createOrganization({
        name,
        slug,
        currency,
        createdById: req.user!.id,
      });

      // Update admin's active organizationId
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { organizationId: org.id },
      });

      return res.status(201).json({
        message: "Organization created successfully.",
        organization: org,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to create organization",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/organizations/current
 * Retrieves details for the authenticated user's current organization
 */
organizationRouter.get(
  "/current",
  requireAuth,
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
      const org = await getOrganizationById(req.user!.organizationId!);

      if (!org) {
        return res.status(404).json({
          error: "Not Found",
          message: "Organization not found.",
        });
      }

      return res.json({ organization: org });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to fetch organization",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/organizations
 * Lists all organizations accessible to the Admin
 */
organizationRouter.get(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const organizations = await listUserOrganizations(req.user!.id);
      return res.json({ organizations });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to list organizations",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * PATCH /api/organizations/current
 * Admin updates organization configuration (name, currency, slug)
 */
organizationRouter.patch(
  "/current",
  requireAuth,
  requireRole(UserRole.ADMIN),
  requireOrg,
  async (req: AuthRequest, res: Response) => {
    try {
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
    } catch (error) {
      return res.status(500).json({
        error: "Failed to update organization",
        message: (error as Error).message,
      });
    }
  }
);
