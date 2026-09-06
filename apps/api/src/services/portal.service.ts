import {
  prisma,
  UserRole,
  QuoteStage,
  ApprovalStatus,
  CounterProposalStatus,
  type Prisma,
} from "@repo/db";
import { AppError } from "../middleware/error.js";
import { calculateBlendedRisk, type RiskLineInput } from "../lib/risk-engine.js";
import { triggerApprovalWorkflow, evaluateApprovalRules } from "./approval.service.js";
import { confirmQuotation, type ConfirmQuotationResult } from "./confirmation.service.js";
import { getRedisConnection } from "../config/redis.js";
import type {
  CreateQuotationCommentInput,
  CreateCounterProposalInput,
  ConfirmQuotationInput,
  SignQuotationInput,
} from "../schemas/portal.schema.js";

// =============================================================================
// Helper: Ensure Customer User Record for Foreign Key Integrity
// =============================================================================

async function resolveCustomerAuthorId(
  customer?: { id: string; name?: string | null; email?: string | null; portalUserId?: string | null } | null,
  orgId?: string | null,
  providedName?: string | null,
  providedEmail?: string | null
): Promise<string> {
  // 1. If customer already has a linked portal user
  if (customer?.portalUserId) {
    const existing = await prisma.user.findUnique({ where: { id: customer.portalUserId } });
    if (existing) return existing.id;
  }

  const lookupEmail = (providedEmail || customer?.email || "customer@client.com").trim().toLowerCase();

  // 2. Lookup existing user by email
  const userByEmail = await prisma.user.findFirst({
    where: { email: { equals: lookupEmail, mode: "insensitive" } },
  });
  if (userByEmail) {
    if (customer?.id && !customer.portalUserId) {
      // Best effort link portalUserId to customer profile
      await prisma.customer.update({
        where: { id: customer.id },
        data: { portalUserId: userByEmail.id },
      }).catch(() => {});
    }
    return userByEmail.id;
  }

  // 3. Try creating user
  try {
    const newUser = await prisma.user.create({
      data: {
        name: (providedName || customer?.name || "Customer Representative").trim(),
        email: lookupEmail,
        role: UserRole.CUSTOMER,
        organizationId: orgId || null,
      },
    });
    if (customer?.id) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { portalUserId: newUser.id },
      }).catch(() => {});
    }
    return newUser.id;
  } catch (_err) {
    // 4. Fallbacks if user creation failed (e.g. duplicate key or constraint)
    const fallbackUser = await prisma.user.findFirst({
      where: { email: { equals: lookupEmail, mode: "insensitive" } },
    });
    if (fallbackUser) return fallbackUser.id;

    const anyUser = await prisma.user.findFirst({
      where: orgId ? { organizationId: orgId } : undefined,
    });
    if (anyUser) return anyUser.id;

    const rootUser = await prisma.user.findFirst();
    if (rootUser) return rootUser.id;

    throw new AppError(500, "AUTHOR_RESOLVE_FAILED", "Failed to resolve customer author ID.");
  }
}

// =============================================================================
// Portal Service Methods
// =============================================================================

/**
 * 0. List Active Quotations for Portal Directory / Switcher (Database-backed)
 */
export async function listActivePortalQuotations(userEmail?: string) {
  const quotations = await prisma.quotation.findMany({
    where: {
      stage: { not: QuoteStage.CANCELLED },
      ...(userEmail ? { customer: { email: { equals: userEmail, mode: "insensitive" } } } : {}),
    },
    select: {
      id: true,
      portalToken: true,
      quoteNumber: true,
      title: true,
      stage: true,
      grandTotal: true,
      createdAt: true,
      customer: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { lines: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return quotations.map((q) => ({
    id: q.id,
    token: q.portalToken || q.quoteNumber,
    quoteNumber: q.quoteNumber,
    title: q.title || "Enterprise Proposal",
    label: `${q.quoteNumber} (${q.title || "Enterprise"} - $${Number(q.grandTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
    stage: q.stage,
    customer: q.customer?.name || "Client Enterprise",
    customerEmail: q.customer?.email || "",
    grandTotal: Number(q.grandTotal),
    lineCount: q._count?.lines || 0,
    createdAt: q.createdAt.toISOString(),
  }));
}

/**
 * 1. Read-Only Quotation View for the Customer
 */
export async function getPortalQuotation(portalToken: string) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [
        { portalToken },
        { quoteNumber: portalToken },
        { id: portalToken },
      ],
    },
    include: {
      customer: {
        include: { tier: true },
      },
      salesRep: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      lines: {
        include: {
          product: {
            include: { category: true },
          },
          variant: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      comments: {
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          quotationLine: {
            select: { id: true, description: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      counterProposals: {
        include: {
          respondedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      approvalRequest: {
        include: {
          steps: {
            include: {
              reviewer: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: { stepNumber: "asc" },
          },
        },
      },
      signature: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          _count: {
            select: { users: true, salesManagers: true, salesReps: true, quotations: true },
          },
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found for the provided portal link.");
  }

  // Format line items to attach their line-level comments (matches PortalQuoteData in web)
  const formattedLines = quotation.lines.map((line) => {
    const lineComments = quotation.comments
      .filter((c) => c.quotationLineId === line.id)
      .map((c) => ({
        id: c.id,
        message: c.message,
        authorRole: c.authorRole,
        authorName: c.author?.name || "User",
        createdAt: c.createdAt.toISOString(),
      }));

    return {
      ...line,
      description: line.description || line.product.name,
      comments: lineComments,
    };
  });

  const formattedComments = quotation.comments.map((c) => ({
    id: c.id,
    message: c.message,
    authorRole: c.authorRole,
    authorName: c.author?.name || "User",
    quotationLineId: c.quotationLineId,
    createdAt: c.createdAt.toISOString(),
  }));

  const formattedCounterProposals = quotation.counterProposals.map((cp) => ({
    id: cp.id,
    proposedGrandTotal: cp.proposedGrandTotal,
    proposedDiscountPercent: cp.proposedDiscountPercent,
    customerNotes: cp.customerNotes,
    status: cp.status,
    respondedBy: cp.respondedBy?.name || null,
    createdAt: cp.createdAt.toISOString(),
  }));

  const signatureData = quotation.signature
    ? {
        signedByName: quotation.signature.signedByName,
        signedByEmail: quotation.signature.signedByEmail,
        signedAt: quotation.signature.signedAt.toISOString(),
      }
    : null;

  const allCustomerQuotations = await prisma.quotation.findMany({
    where: { customerId: quotation.customerId, organizationId: quotation.organizationId },
    select: {
      id: true,
      quoteNumber: true,
      title: true,
      stage: true,
      approvalStatus: true,
      subtotal: true,
      discountTotal: true,
      taxTotal: true,
      grandTotal: true,
      portalToken: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { lines: true, comments: true, counterProposals: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    ...quotation,
    lines: formattedLines,
    comments: formattedComments,
    counterProposals: formattedCounterProposals,
    signature: signatureData,
    customerQuotations: allCustomerQuotations,
  };
}

/**
 * 2. Post Line-Level or Quote-Level Question / Comment
 */
export async function addQuotationComment(
  portalToken: string,
  input: CreateQuotationCommentInput
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [
        { portalToken },
        { quoteNumber: portalToken },
        { id: portalToken },
      ],
    },
    include: { customer: true, lines: true },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  if (input.quotationLineId) {
    const lineExists = quotation.lines.some((l) => l.id === input.quotationLineId);
    if (!lineExists) {
      throw new AppError(400, "INVALID_LINE", "The specified quotation line does not exist on this quote.");
    }
  }

  const authorId = await resolveCustomerAuthorId(
    quotation.customer,
    quotation.organizationId,
    input.authorName || quotation.customer?.name,
    input.authorEmail || quotation.customer?.email
  );

  return prisma.$transaction(async (tx) => {
    // If quotation is in DRAFT or APPROVED stage, customer interaction moves it to NEGOTIATION
    if (quotation.stage === QuoteStage.DRAFT || quotation.stage === QuoteStage.APPROVED) {
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { stage: QuoteStage.NEGOTIATION },
      });
    }

    const comment = await tx.quotationComment.create({
      data: {
        quotationId: quotation.id,
        quotationLineId: input.quotationLineId || null,
        authorId,
        authorRole: UserRole.CUSTOMER,
        message: input.message.trim(),
        proposedDiscountPercent: input.proposedDiscountPercent ?? null,
        isResolved: false,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        quotationLine: {
          select: { id: true, description: true },
        },
      },
    });

    try {
      const redis = getRedisConnection();
      await redis.publish(
        `quotation:${quotation.id}:comments`,
        JSON.stringify({
          type: "NEW_COMMENT",
          quotationId: quotation.id,
          comment: {
            id: comment.id,
            message: comment.message,
            authorRole: comment.authorRole,
            authorName: comment.author?.name || quotation.customer?.name || "Customer",
            quotationLineId: comment.quotationLineId,
            createdAt: comment.createdAt.toISOString(),
          },
        })
      );
    } catch (_err) {
      // Graceful fallback
    }

    return comment;
  });
}

/**
 * 3. Customer Submits a Counter-Offer / Counter-Proposal
 */
export async function submitCounterProposal(
  portalToken: string,
  input: CreateCounterProposalInput
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [
        { portalToken },
        { quoteNumber: portalToken },
        { id: portalToken },
      ],
    },
    include: { customer: true, lines: true },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  if (quotation.stage === QuoteStage.CONFIRMED) {
    throw new AppError(400, "ALREADY_CONFIRMED", "Cannot submit counter-proposal on a confirmed order.");
  }

  const discPercent = input.proposedDiscountPercent ?? input.proposedDiscount ?? 0;

  // Auto-calculate proposedGrandTotal if omitted
  const proposedTotal =
    input.proposedGrandTotal !== undefined && input.proposedGrandTotal !== null && input.proposedGrandTotal > 0
      ? input.proposedGrandTotal
      : Math.round(quotation.subtotal * (1 - discPercent / 100) * 100) / 100;

  // Pre-resolve authorId before transaction so transaction is never poisoned
  const authorId = await resolveCustomerAuthorId(
    quotation.customer,
    quotation.organizationId,
    input.authorName || quotation.customer?.name,
    input.authorEmail || quotation.customer?.email
  );

  return prisma.$transaction(async (tx) => {
    // Supersede previous pending counter-proposals
    await tx.counterProposal.updateMany({
      where: {
        quotationId: quotation.id,
        status: CounterProposalStatus.PENDING,
      },
      data: {
        status: CounterProposalStatus.SUPERSEDED,
      },
    });

    // Advance quotation stage to NEGOTIATION
    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        stage: QuoteStage.NEGOTIATION,
        approvalStatus: ApprovalStatus.PENDING,
      },
    });

    // If line-level proposed discounts were provided, encode into customer notes or metadata
    let formattedNotes = input.customerNotes || input.message || "";
    if (input.lineDiscounts && input.lineDiscounts.length > 0) {
      const lineSummary = input.lineDiscounts
        .map((ld) => `[Line ${ld.lineId}: ${ld.proposedDiscountPercent}%]`)
        .join(" ");
      formattedNotes = formattedNotes ? `${formattedNotes} | Line Adjustments: ${lineSummary}` : `Line Adjustments: ${lineSummary}`;
    }

    const counterProposal = await tx.counterProposal.create({
      data: {
        quotationId: quotation.id,
        proposedGrandTotal: proposedTotal,
        proposedDiscountPercent: discPercent,
        customerNotes: formattedNotes || null,
        status: CounterProposalStatus.PENDING,
      },
    });

    // Create quotation discussion comment entry
    const createdComment = await tx.quotationComment.create({
      data: {
        quotationId: quotation.id,
        authorId,
        authorRole: UserRole.CUSTOMER,
        message: `Customer Counter-Proposal Submitted: Requested ${discPercent}% discount tier (Target Deal Total: ₹${proposedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}). ${formattedNotes ? `Buyer Notes: "${formattedNotes}"` : ""}`,
        proposedDiscountPercent: discPercent,
        isResolved: false,
      },
    });

    // Create audit log
    await tx.approvalAuditLog.create({
      data: {
        quotationId: quotation.id,
        organizationId: quotation.organizationId,
        actorId: authorId,
        actorRole: UserRole.CUSTOMER,
        action: "COUNTER_PROPOSAL_SUBMITTED",
        reason: `Customer submitted commercial counter-offer for ${discPercent}% discount (₹${proposedTotal.toLocaleString("en-IN")}). Stage moved to NEGOTIATION.`,
        metadata: {
          proposedDiscountPercent: discPercent,
          proposedGrandTotal: proposedTotal,
          notes: formattedNotes,
        },
      },
    });

    try {
      const redis = getRedisConnection();
      await redis.publish(
        `quotation:${quotation.id}:comments`,
        JSON.stringify({
          type: "COUNTER_PROPOSAL_SUBMITTED",
          quotationId: quotation.id,
          proposedDiscountPercent: discPercent,
          proposedGrandTotal: proposedTotal,
          comment: {
            id: createdComment.id,
            message: createdComment.message,
            authorRole: "CUSTOMER",
            authorName: quotation.customer?.name || "Customer",
            createdAt: createdComment.createdAt.toISOString(),
          },
        })
      );
    } catch (_err) {
      // Safe fallback
    }

    return counterProposal;
  });
}

/**
 * 4. Staff (Sales Rep / Sales Manager / Admin) Accepts Counter-Proposal
 *
 * Business rule:
 * - Build draft copy of lines with proposed discount applied
 * - Call calculateBlendedRisk() from Phase 4
 * - If new score exceeds approved threshold / triggers discount rules:
 *     flip stage to PENDING_APPROVAL, create fresh ApprovalRequest (Phase 5),
 *     mark CounterProposal ACCEPTED (pending re-approval).
 * - If score does not exceed threshold:
 *     apply lines, recalculate financials, advance stage to APPROVED / NEGOTIATION.
 */
export async function acceptCounterProposal(
  counterProposalId: string,
  responderUserId: string,
  responderRole: UserRole,
  overrideNotes?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const counterProposal = await tx.counterProposal.findUnique({
      where: { id: counterProposalId },
      include: {
        quotation: {
          include: {
            customer: { include: { tier: true } },
            lines: {
              include: {
                product: { include: { category: true } },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!counterProposal) {
      throw new AppError(404, "NOT_FOUND", "Counter-proposal not found.");
    }

    if (counterProposal.status !== CounterProposalStatus.PENDING) {
      throw new AppError(
        400,
        "INVALID_STATUS",
        `Counter-proposal is already in ${counterProposal.status} status.`
      );
    }

    const quotation = counterProposal.quotation;
    const customerTierCeiling = quotation.customer?.tier?.discountCeiling ?? 100.0;

    // Parse potential line-level discounts from customerNotes e.g. "[Line cl...: 25%]"
    const lineDiscountOverrides = new Map<string, number>();
    if (counterProposal.customerNotes) {
      const regex = /\[Line\s+([a-zA-Z0-9_-]+):\s*([0-9.]+)%\]/g;
      let match;
      while ((match = regex.exec(counterProposal.customerNotes)) !== null) {
        const lineId = match[1];
        const disc = parseFloat(match[2] || "0");
        if (lineId && !isNaN(disc)) {
          lineDiscountOverrides.set(lineId, disc);
        }
      }
    }

    // Build draft risk line inputs with proposed discounts applied
    const draftRiskLines: RiskLineInput[] = quotation.lines.map((line) => {
      let lineDiscount = line.discountPercent;

      if (lineDiscountOverrides.has(line.id)) {
        lineDiscount = lineDiscountOverrides.get(line.id)!;
      } else if (lineDiscountOverrides.size === 0) {
        // If no specific line specified, check if service or uniform discount applies
        lineDiscount = counterProposal.proposedDiscountPercent;
      }

      return {
        productId: line.productId,
        categoryId: line.product.categoryId,
        categoryCeiling: line.product.category.discountCeiling,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        costPrice: line.costPrice,
        discountPercent: lineDiscount,
      };
    });

    // Run Pure Risk Engine calculation
    const riskResult = calculateBlendedRisk(draftRiskLines, customerTierCeiling);

    // Apply recalculated line figures
    for (let i = 0; i < quotation.lines.length; i++) {
      const line = quotation.lines[i];
      const calc = riskResult.lines[i];
      const draftLine = draftRiskLines[i];
      if (!line || !calc || !draftLine) continue;

      await tx.quotationLine.update({
        where: { id: line.id },
        data: {
          discountPercent: draftLine.discountPercent,
          categoryCeiling: calc.categoryCeiling,
          customerCeiling: calc.customerCeiling,
          isCeilingBreached: calc.isCeilingBreached,
          riskPoints: calc.riskPoints,
          discountAmount: calc.discountAmount,
          netPrice: calc.netPrice,
          totalCost: calc.totalCost,
          lineMargin: calc.lineMargin,
          lineMarginPercent: calc.lineMarginPercent,
        },
      });
    }

    // Update stored aggregate totals
    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        subtotal: riskResult.subtotal,
        discountTotal: riskResult.discountTotal,
        grandTotal: riskResult.grandTotal + quotation.taxTotal,
        totalCost: riskResult.totalCost,
        grossMargin: riskResult.grossMargin,
        grossMarginPercent: riskResult.grossMarginPercent,
        blendedRiskScore: riskResult.blendedRiskScore,
      },
    });

    const discountPercent =
      riskResult.subtotal > 0
        ? (riskResult.discountTotal / riskResult.subtotal) * 100
        : 0;

    // Evaluate discount approval governance
    const approvalEvaluation = await evaluateApprovalRules(
      quotation.organizationId,
      riskResult.blendedRiskScore,
      discountPercent
    );

    const previousRiskScore = quotation.blendedRiskScore;
    const scoreExceedsApprovedThreshold =
      (riskResult.blendedRiskScore > previousRiskScore && riskResult.blendedRiskScore > 0) ||
      riskResult.lines.some((l) => l.isCeilingBreached);

    let requiresManagerApproval = approvalEvaluation.requiresManagerApproval;
    const requiresFinanceApproval = approvalEvaluation.requiresFinanceApproval;

    if (scoreExceedsApprovedThreshold && !requiresManagerApproval && !requiresFinanceApproval) {
      requiresManagerApproval = true;
    }

    const requiresReapproval =
      scoreExceedsApprovedThreshold ||
      requiresManagerApproval ||
      requiresFinanceApproval;

    const updatedProposalStatus = CounterProposalStatus.ACCEPTED;
    let responseNotes = overrideNotes || "Counter-proposal accepted by sales representative.";

    if (requiresReapproval) {
      responseNotes = `${responseNotes} Re-approval workflow triggered due to elevated discount (${discountPercent.toFixed(1)}%) / risk score (${riskResult.blendedRiskScore.toFixed(1)} vs approved ${previousRiskScore.toFixed(1)}).`;

      // Trigger Phase 5 Approval Workflow
      await triggerApprovalWorkflow(tx, {
        quotationId: quotation.id,
        orgId: quotation.organizationId,
        actorId: responderUserId,
        actorRole: responderRole,
        blendedRiskScore: riskResult.blendedRiskScore,
        discountPercent,
        requiresManagerApproval,
        requiresFinanceApproval,
        reason: `Customer counter-proposal accepted. New risk score of ${riskResult.blendedRiskScore.toFixed(1)} exceeds previously approved threshold of ${previousRiskScore.toFixed(1)}.`,
        metadata: {
          counterProposalId: counterProposal.id,
          proposedGrandTotal: counterProposal.proposedGrandTotal,
          previousRiskScore,
          newRiskScore: riskResult.blendedRiskScore,
          escalationLevel: requiresFinanceApproval
            ? "SALES_MANAGER_AND_FINANCE"
            : "SALES_MANAGER",
        },
      });
    } else {
      // Direct approval without escalation
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          stage: QuoteStage.APPROVED,
          approvalStatus: ApprovalStatus.APPROVED,
        },
      });
    }

    // Update CounterProposal record
    const updatedCounterProposal = await tx.counterProposal.update({
      where: { id: counterProposal.id },
      data: {
        status: updatedProposalStatus,
        respondedById: responderUserId,
        respondedAt: new Date(),
        responseNotes,
      },
      include: {
        respondedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const refreshedQuotation = await tx.quotation.findUnique({
      where: { id: quotation.id },
      include: {
        lines: true,
        approvalRequest: { include: { steps: true } },
      },
    });

    return {
      counterProposal: updatedCounterProposal,
      quotation: refreshedQuotation,
      requiresReapproval,
    };
  });
}

/**
 * 5. Staff Declines Counter-Proposal
 */
export async function rejectCounterProposal(
  counterProposalId: string,
  responderUserId: string,
  responseNotes?: string | null
) {
  const counterProposal = await prisma.counterProposal.findUnique({
    where: { id: counterProposalId },
  });

  if (!counterProposal) {
    throw new AppError(404, "NOT_FOUND", "Counter-proposal not found.");
  }

  if (counterProposal.status !== CounterProposalStatus.PENDING) {
    throw new AppError(
      400,
      "INVALID_STATUS",
      `Counter-proposal is already ${counterProposal.status}.`
    );
  }

  return prisma.counterProposal.update({
    where: { id: counterProposalId },
    data: {
      status: CounterProposalStatus.REJECTED,
      respondedById: responderUserId,
      respondedAt: new Date(),
      responseNotes: responseNotes || "Counter-proposal declined.",
    },
    include: {
      respondedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * 6. Customer Electronic Signature & Automated Deal Confirmation
 *
 * Business rules:
 * - QuoteSignature uniqueness enforced with clean HTTP 409 Conflict if already signed
 * - Calls Phase 7 confirmation service internally to create Invoices, Subscriptions & Fulfillment Orders
 */
export async function signQuotation(
  portalToken: string,
  input: SignQuotationInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  signature: any;
  confirmation: ConfirmQuotationResult;
}> {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [
        { portalToken },
        { quoteNumber: portalToken },
        { id: portalToken },
      ],
    },
    include: { customer: true, signature: true },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  // Idempotent signature constraint check -> surface clean 409
  if (quotation.signature) {
    throw new AppError(
      409,
      "ALREADY_SIGNED",
      "This quotation has already been electronically signed and confirmed."
    );
  }

  if (quotation.stage === QuoteStage.PENDING_APPROVAL) {
    throw new AppError(
      400,
      "PENDING_APPROVAL",
      "This quotation is currently pending internal discount approval and cannot be signed yet."
    );
  }

  const resolvedName = (input.signedByName || input.signerName || quotation.customer?.name || "Customer Representative").trim();
  const resolvedEmail = (input.signedByEmail || input.signerEmail || quotation.customer?.email || "buyer@customer.com").trim().toLowerCase();

  const customerUserId = await resolveCustomerAuthorId(
    quotation.customer,
    quotation.organizationId,
    resolvedName,
    resolvedEmail
  );

  return prisma.$transaction(async (tx) => {
    // 1. Create QuoteSignature
    const signature = await tx.quoteSignature.create({
      data: {
        quotationId: quotation.id,
        signedByName: resolvedName,
        signedByEmail: resolvedEmail,
        signatureData: input.signatureData,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        signedAt: new Date(),
      },
    });

    // 2. Centralized Phase 7 Deal Confirmation Logic
    const confirmation = await confirmQuotation(
      tx,
      quotation.id,
      quotation.organizationId,
      customerUserId,
      UserRole.CUSTOMER
    );

    return {
      signature,
      confirmation,
    };
  });
}

/**
 * 7. One-Click Deal Confirmation (Direct Acceptance)
 *
 * For buyers who confirm terms with one click without drawing signature strokes.
 * Triggers Phase 7 confirmation to generate Invoices, Subscriptions & Fulfillment orders.
 */
export async function confirmPortalQuotation(
  portalToken: string,
  input?: ConfirmQuotationInput
): Promise<{
  success: boolean;
  message: string;
  confirmation: ConfirmQuotationResult;
}> {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [
        { portalToken },
        { quoteNumber: portalToken },
        { id: portalToken },
      ],
    },
    include: { customer: true, signature: true },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  if (quotation.stage === QuoteStage.CONFIRMED) {
    throw new AppError(
      409,
      "ALREADY_CONFIRMED",
      "This quotation has already been confirmed."
    );
  }

  if (quotation.stage === QuoteStage.PENDING_APPROVAL) {
    throw new AppError(
      400,
      "PENDING_APPROVAL",
      "This quotation is currently pending internal discount approval and cannot be confirmed yet."
    );
  }

  const customerUserId = await resolveCustomerAuthorId(
    quotation.customer,
    quotation.organizationId,
    input?.customerName || quotation.customer?.name,
    input?.customerEmail || quotation.customer?.email
  );

  return prisma.$transaction(async (tx) => {
    // 1. Centralized Phase 7 Deal Confirmation Logic
    const confirmation = await confirmQuotation(
      tx,
      quotation.id,
      quotation.organizationId,
      customerUserId,
      UserRole.CUSTOMER
    );

    return {
      success: true,
      message: "Quotation confirmed successfully with one click. Invoices and fulfillment generated.",
      confirmation,
    };
  });
}

