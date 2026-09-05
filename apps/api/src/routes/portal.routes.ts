import { Router } from "express";
import { portalAuth } from "../middleware/portalAuth.js";
import { validateBody } from "../middleware/validate.js";
import {
  CreateQuotationCommentSchema,
  CreateCounterProposalSchema,
  ConfirmQuotationSchema,
  SignQuotationSchema,
} from "../schemas/portal.schema.js";
import * as portalController from "../controllers/portal.controller.js";

export const portalRouter = Router();

// 1. Read-only quotation view for the customer (supports /api/portal/:token and /api/portal/quotations/:token)
portalRouter.get(
  ["/:token", "/quotations/:token"],
  portalAuth,
  portalController.getQuotation
);

// 2. Line-level or quote-level question/comment
portalRouter.post(
  ["/:token/comments", "/:token/comment", "/quotations/:token/comments", "/quotations/:token/comment"],
  portalAuth,
  validateBody(CreateQuotationCommentSchema),
  portalController.postComment
);

// 3. Customer's counter-offer (supports both singular and plural)
portalRouter.post(
  ["/:token/counter-proposal", "/:token/counter-proposals", "/quotations/:token/counter-proposals", "/quotations/:token/counter-proposal"],
  portalAuth,
  validateBody(CreateCounterProposalSchema),
  portalController.postCounterProposal
);

// 4. One-click quotation confirmation
portalRouter.post(
  ["/:token/confirm", "/quotations/:token/confirm"],
  portalAuth,
  validateBody(ConfirmQuotationSchema),
  portalController.confirmQuotation
);

// 5. Customer electronic signature -> confirmation
portalRouter.post(
  ["/:token/sign", "/quotations/:token/sign"],
  portalAuth,
  validateBody(SignQuotationSchema),
  portalController.signQuotation
);
