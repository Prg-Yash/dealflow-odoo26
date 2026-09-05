import { Router } from "express";
import { UserRole } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.js";
import {
  AcceptCounterProposalSchema,
  RejectCounterProposalSchema,
} from "../schemas/portal.schema.js";
import * as counterProposalController from "../controllers/counter-proposal.controller.js";

export const counterProposalRouter = Router();

// Staff accepts customer counter-proposal
counterProposalRouter.post(
  "/:id/accept",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER),
  validateBody(AcceptCounterProposalSchema),
  counterProposalController.acceptCounterProposal
);

// Staff rejects customer counter-proposal
counterProposalRouter.post(
  "/:id/reject",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER),
  validateBody(RejectCounterProposalSchema),
  counterProposalController.rejectCounterProposal
);
