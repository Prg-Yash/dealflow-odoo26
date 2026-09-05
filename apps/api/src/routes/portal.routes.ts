import { Router } from "express";
import { portalAuth } from "../middleware/portalAuth.js";
import { validateBody } from "../middleware/validate.js";
import {
  CreateQuotationCommentSchema,
  CreateCounterProposalSchema,
  SignQuotationSchema,
} from "../schemas/portal.schema.js";
import * as portalController from "../controllers/portal.controller.js";

export const portalRouter = Router();

// 1. Read-only quotation view for the customer
portalRouter.get(
  "/quotations/:token",
  portalAuth,
  portalController.getQuotation
);

// 2. Line-level or quote-level question/comment
portalRouter.post(
  "/quotations/:token/comments",
  portalAuth,
  validateBody(CreateQuotationCommentSchema),
  portalController.postComment
);

// 3. Customer's counter-offer
portalRouter.post(
  "/quotations/:token/counter-proposals",
  portalAuth,
  validateBody(CreateCounterProposalSchema),
  portalController.postCounterProposal
);

// 4. Customer electronic signature -> confirmation
portalRouter.post(
  "/quotations/:token/sign",
  portalAuth,
  validateBody(SignQuotationSchema),
  portalController.signQuotation
);
