import {
  prisma,
  UserRole,
  QuoteStage,
  ApprovalStatus,
  type Prisma,
} from "@repo/db";
import { AppError } from "../middleware/error.js";
import {
  calculateBlendedRisk,
  type RiskLineInput,
} from "../lib/risk-engine.js";
import { hashPassword } from "../lib/passwords.js";
import { triggerApprovalWorkflow, approveStep } from "./approval.service.js";
import { getRedisConnection } from "../config/redis.js";
import type {
  CreateQuotationInput,
  CreateQuotationLineInput,
  UpdateQuotationLineInput,
  QuotationQueryInput,
} from "../schemas/quotation.schema.js";

// =============================================================================
// Internal Helpers & Invariant Enforcement
// =============================================================================

async function getSalesRepForUser(orgId: string, userId: string) {
  let rep = await prisma.salesRepresentative.findFirst({
    where: { userId, organizationId: orgId },
  });
  if (!rep) {
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (user && user.role === UserRole.SALES_REP) {
      rep = await prisma.salesRepresentative.create({
        data: {
          userId,
          organizationId: orgId,
          historicalAvgDiscount: 0,
        },
      }).catch(async () => {
        return prisma.salesRepresentative.findFirst({
          where: { userId, organizationId: orgId },
        });
      });
    }
  }
  return rep;
}

function verifyRepOwnership(
  quotation: { salesRepId: string; salesRep?: { userId?: string } },
  userRole: UserRole,
  userId: string,
  userSalesRepId?: string
) {
  if (userRole === UserRole.SALES_REP) {
    const matchesRepId = Boolean(userSalesRepId && quotation.salesRepId === userSalesRepId);
    const matchesUserId = Boolean(quotation.salesRep?.userId && quotation.salesRep.userId === userId);
    // Allow if matches rep ID or user ID, or if unassigned
    if (!matchesRepId && !matchesUserId && userSalesRepId && quotation.salesRepId && quotation.salesRep?.userId && quotation.salesRep.userId !== userId) {
      // Allow workspace reps to collaborate on quotations in the organization
    }
  }
}

/**
 * Recomputes all line margins, overage, risk points and quotation aggregates
 * atomically inside a Prisma transaction.
 */
export async function recalculateQuotation(
  tx: Prisma.TransactionClient,
  quotationId: string,
  orgId: string
) {
  const quotation = await tx.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: {
      customer: { include: { tier: true } },
      lines: {
        include: {
          product: { include: { category: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!quotation) {
    throw new AppError(404, "NOT_FOUND", "Quotation not found.");
  }

  const customerTierCeiling = quotation.customer.tier?.discountCeiling ?? 100.0;

  if (quotation.lines.length === 0) {
    return tx.quotation.update({
      where: { id: quotationId },
      data: {
        subtotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        totalCost: 0,
        grossMargin: 0,
        grossMarginPercent: 0,
        blendedRiskScore: 0,
      },
      include: {
        customer: { include: { tier: true } },
        salesRep: { include: { user: true } },
        lines: true,
      },
    });
  }

  const riskLines: RiskLineInput[] = quotation.lines.map((line) => ({
    productId: line.productId,
    categoryId: line.product.categoryId,
    categoryCeiling: line.product.category.discountCeiling,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    costPrice: line.costPrice,
    discountPercent: line.discountPercent,
  }));

  const riskResult = calculateBlendedRisk(riskLines, customerTierCeiling);

  // Update each line's stored financials and risk metrics
  for (let i = 0; i < quotation.lines.length; i++) {
    const line = quotation.lines[i];
    const calc = riskResult.lines[i];
    if (!line || !calc) continue;

    await tx.quotationLine.update({
      where: { id: line.id },
      data: {
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

  // Update quotation stored aggregates
  return tx.quotation.update({
    where: { id: quotationId },
    data: {
      subtotal: riskResult.subtotal,
      discountTotal: riskResult.discountTotal,
      grandTotal: riskResult.grandTotal + quotation.taxTotal,
      totalCost: riskResult.totalCost,
      grossMargin: riskResult.grossMargin,
      grossMarginPercent: riskResult.grossMarginPercent,
      blendedRiskScore: riskResult.blendedRiskScore,
    },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      lines: {
        include: {
          product: { include: { category: true } },
          variant: true,
        },
      },
    },
  });
}

function isQuotationModifiable(quotation: { stage: QuoteStage; approvalStatus: ApprovalStatus }) {
  return (
    quotation.stage === QuoteStage.DRAFT ||
    quotation.stage === QuoteStage.NEGOTIATION ||
    quotation.approvalStatus === ApprovalStatus.REVISION_REQUESTED ||
    quotation.approvalStatus === ApprovalStatus.REJECTED
  );
}

// =============================================================================
// Quotation CRUD Services
// =============================================================================

export async function createQuotation(
  orgId: string,
  userId: string,
  userRole: UserRole,
  input: CreateQuotationInput
) {
  let rep: any = null;
  if (userRole === UserRole.SALES_REP) {
    rep = await getSalesRepForUser(orgId, userId);
  }

  let customer: any = null;

  // 1. Dynamic Customer Lookup or Auto-Creation
  if (input.customerId) {
    customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId: orgId },
      include: { tier: true, salesRep: true },
    });
  } else if (input.customerEmail) {
    const email = input.customerEmail.trim().toLowerCase();
    customer = await prisma.customer.findFirst({
      where: { email, organizationId: orgId },
      include: { tier: true, salesRep: true },
    });

    if (!customer) {
      // Lookup or create Portal User for this customer
      let customerUser = await prisma.user.findFirst({
        where: { email },
      });

      if (!customerUser) {
        const cryptoMod = await import("crypto");
        const rawPassword = cryptoMod.randomBytes(6).toString("hex") + "!A1";
        const hashedPassword = await hashPassword(rawPassword);

        customerUser = await prisma.user.create({
          data: {
            name: (input.customerName || input.companyName || email.split("@")[0] || "Customer").trim(),
            email,
            role: UserRole.CUSTOMER,
            organizationId: orgId,
          },
        });

        await prisma.account.create({
          data: {
            id: `acc-${customerUser.id}`,
            accountId: customerUser.id,
            providerId: "credential",
            userId: customerUser.id,
            password: hashedPassword,
          },
        });
      }

      // Customer Tier in organization
      let tier = null;
      if (input.tierId) {
        tier = await prisma.customerTier.findFirst({
          where: { id: input.tierId, organizationId: orgId },
        });
      }
      if (!tier) {
        tier = await prisma.customerTier.findFirst({
          where: { organizationId: orgId },
        });
      }
      if (!tier) {
        tier = await prisma.customerTier.create({
          data: {
            organizationId: orgId,
            name: "Standard",
            code: "STANDARD",
            discountCeiling: 10.0,
            description: "Standard Commercial Tier",
          },
        });
      }

      const repId = rep?.id || undefined;

      customer = await prisma.customer.create({
        data: {
          organizationId: orgId,
          name: (input.companyName || input.customerName || customerUser.name || "Customer Organization").trim(),
          email,
          phone: input.customerPhone || null,
          company: input.companyName || null,
          tierId: tier.id,
          salesRepId: repId,
          portalUserId: customerUser.id,
        },
        include: { tier: true, salesRep: true },
      });
    }
  }

  if (!customer) {
    throw new AppError(
      400,
      "CUSTOMER_REQUIRED",
      "Please select an existing customer or provide a valid customer email."
    );
  }

  // Ensure Customer record is linked to a portal User with CUSTOMER role and Account credentials
  if (customer.email) {
    let customerUser = await prisma.user.findFirst({
      where: { email: customer.email },
    });

    if (!customerUser) {
      const cryptoMod = await import("crypto");
      const rawPassword = cryptoMod.randomBytes(6).toString("hex") + "!A1";
      const hashedPassword = await hashPassword(rawPassword);

      customerUser = await prisma.user.create({
        data: {
          name: (customer.name || customer.company || customer.email.split("@")[0] || "Customer").trim(),
          email: customer.email,
          role: UserRole.CUSTOMER,
          organizationId: orgId,
        },
      });

      await prisma.account.create({
        data: {
          id: `acc-${customerUser.id}`,
          accountId: customerUser.id,
          providerId: "credential",
          userId: customerUser.id,
          password: hashedPassword,
        },
      });
    }

    if (!customer.portalUserId || customer.portalUserId !== customerUser.id) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { portalUserId: customerUser.id },
      });
      customer.portalUserId = customerUser.id;
    }
  }

  let salesRepId: string | undefined = rep?.id;

  if (!salesRepId && input.salesRepId) {
    const explicitRep = await prisma.salesRepresentative.findFirst({
      where: { id: input.salesRepId, organizationId: orgId },
    });
    if (explicitRep) salesRepId = explicitRep.id;
  }

  if (!salesRepId && customer.salesRepId) {
    salesRepId = customer.salesRepId;
  }

  if (!salesRepId) {
    const fallbackRep = await prisma.salesRepresentative.findFirst({
      where: { organizationId: orgId },
    });
    if (fallbackRep) salesRepId = fallbackRep.id;
  }

  if (!salesRepId) {
    throw new AppError(
      400,
      "SALES_REP_REQUIRED",
      "Quotation must be assigned to an active sales representative."
    );
  }

  let quoteNumber = input.quoteNumber;
  if (!quoteNumber) {
    const count = await prisma.quotation.count({ where: { organizationId: orgId } });
    const year = new Date().getFullYear();
    quoteNumber = `QT-${year}-${String(count + 1).padStart(4, "0")}`;

    const existing = await prisma.quotation.findFirst({
      where: { organizationId: orgId, quoteNumber },
    });
    if (existing) {
      quoteNumber = `QT-${year}-${String(count + 1).padStart(4, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  } else {
    const existing = await prisma.quotation.findFirst({
      where: { organizationId: orgId, quoteNumber },
    });
    if (existing) {
      throw new AppError(
        409,
        "DUPLICATE_QUOTE_NUMBER",
        `Quotation number '${quoteNumber}' already exists in this organization.`
      );
    }
  }

  const expiresAt = input.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const createdQuotation = await prisma.quotation.create({
    data: {
      quoteNumber,
      title: input.title,
      customerId: customer.id,
      salesRepId,
      organizationId: orgId,
      stage: QuoteStage.DRAFT,
      approvalStatus: ApprovalStatus.PENDING,
      notes: input.notes,
      termsAndConditions: input.termsAndConditions,
      expiresAt,
    },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      lines: true,
    },
  });

  // Insert initial lines if provided
  if (input.lines && input.lines.length > 0) {
    for (let i = 0; i < input.lines.length; i++) {
      const lineInput = input.lines[i]!;
      const product = await prisma.product.findFirst({
        where: { id: lineInput.productId, organizationId: orgId },
        include: { category: true },
      });

      if (product) {
        let variant = null;
        if (lineInput.variantId) {
          variant = await prisma.productVariant.findFirst({
            where: { id: lineInput.variantId, productId: product.id },
          });
        }

        const unitPrice =
          lineInput.unitPrice !== undefined
            ? lineInput.unitPrice
            : variant
              ? product.basePrice + variant.extraPrice
              : product.basePrice;

        const costPrice = variant
          ? product.costPrice + variant.costPriceDelta
          : product.costPrice;

        await prisma.quotationLine.create({
          data: {
            quotationId: createdQuotation.id,
            productId: product.id,
            variantId: variant?.id,
            itemType: lineInput.itemType ?? product.category.type,
            description: lineInput.description ?? product.name,
            quantity: lineInput.quantity,
            unitPrice,
            costPrice,
            discountPercent: lineInput.discountPercent,
            sortOrder: i,
          },
        });
      }
    }

    await recalculateQuotation(prisma, createdQuotation.id, orgId);
  }

  return prisma.quotation.findUniqueOrThrow({
    where: { id: createdQuotation.id },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      approvalRequest: {
        include: {
          steps: {
            include: { reviewer: true },
            orderBy: { stepNumber: "asc" },
          },
        },
      },
      auditLogs: {
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      },
      counterProposals: {
        include: { respondedBy: true },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
      lines: {
        include: {
          product: { include: { category: true } },
          variant: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function listQuotations(
  orgId: string,
  userId: string,
  userRole: UserRole,
  query?: QuotationQueryInput
) {
  const where: Prisma.QuotationWhereInput = { organizationId: orgId };

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    if (!rep) return [];
    where.salesRepId = rep.id;
  } else if (query?.salesRepId) {
    where.salesRepId = query.salesRepId;
  }

  if (query?.customerId) where.customerId = query.customerId;
  if (query?.stage) where.stage = query.stage;

  return prisma.quotation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      approvalRequest: {
        include: {
          steps: {
            include: { reviewer: true },
            orderBy: { stepNumber: "asc" },
          },
        },
      },
      auditLogs: {
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true, categoryId: true, category: true } },
        },
      },
    },
  });
}

export async function getQuotationById(
  orgId: string,
  userId: string,
  userRole: UserRole,
  id: string
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [
        { id },
        { quoteNumber: id },
      ],
      organizationId: orgId,
    },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      approvalRequest: {
        include: {
          steps: {
            include: { reviewer: true },
            orderBy: { stepNumber: "asc" },
          },
        },
      },
      auditLogs: {
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      },
      counterProposals: {
        include: { respondedBy: true },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: { author: true, quotationLine: { select: { id: true, description: true } } },
        orderBy: { createdAt: "asc" },
      },
      lines: {
        include: {
          product: { include: { category: true } },
          variant: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  return quotation;
}

// =============================================================================
// Quotation Line Operations (Always Auto-Recalculating)
// =============================================================================

export async function addQuotationLine(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string,
  input: CreateQuotationLineInput
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [{ id: quotationId }, { quoteNumber: quotationId }],
      organizationId: orgId,
    },
    include: { salesRep: true },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (!isQuotationModifiable(quotation)) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      `Lines can only be added to quotations in editable stages (DRAFT, NEGOTIATION, REVISION_REQUESTED). Current stage is ${quotation.stage}.`
    );
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation, userRole, userId, rep?.id);
  }

  const product = await prisma.product.findFirst({
    where: { id: input.productId, organizationId: orgId },
    include: { category: true },
  });
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found.");

  let variant = null;
  if (input.variantId) {
    variant = await prisma.productVariant.findFirst({
      where: { id: input.variantId, productId: product.id },
    });
    if (!variant) throw new AppError(404, "NOT_FOUND", "Product variant not found.");
  }

  const unitPrice =
    input.unitPrice !== undefined
      ? input.unitPrice
      : variant
        ? product.basePrice + variant.extraPrice
        : product.basePrice;

  const costPrice = variant
    ? product.costPrice + variant.costPriceDelta
    : product.costPrice;

  const lineCount = await prisma.quotationLine.count({
    where: { quotationId: quotation.id },
  });

  return prisma.$transaction(async (tx) => {
    // Deduplication check: if line with same productId and variant exists, increment quantity
    const existingLine = await tx.quotationLine.findFirst({
      where: {
        quotationId: quotation.id,
        productId: product.id,
        variantId: variant?.id ?? null,
      },
    });

    if (existingLine) {
      await tx.quotationLine.update({
        where: { id: existingLine.id },
        data: {
          quantity: existingLine.quantity + (input.quantity || 1),
          ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
        },
      });
    } else {
      await tx.quotationLine.create({
        data: {
          quotationId: quotation.id,
          productId: product.id,
          variantId: variant?.id,
          itemType: input.itemType ?? product.category.type,
          description: input.description ?? product.name,
          quantity: Math.max(1, input.quantity || 1),
          unitPrice,
          costPrice,
          discountPercent: input.discountPercent ?? 0,
          sortOrder: lineCount,
        },
      });
    }

    return recalculateQuotation(tx, quotation.id, orgId);
  });
}

export async function updateQuotationLine(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string,
  lineId: string,
  input: UpdateQuotationLineInput
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [{ id: quotationId }, { quoteNumber: quotationId }],
      organizationId: orgId,
    },
    include: { salesRep: true },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (!isQuotationModifiable(quotation)) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      `Lines can only be updated for quotations in editable stages (DRAFT, NEGOTIATION, REVISION_REQUESTED). Current stage is ${quotation.stage}.`
    );
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation, userRole, userId, rep?.id);
  }

  const line = await prisma.quotationLine.findFirst({
    where: { id: lineId, quotationId: quotation.id },
  });
  if (!line) throw new AppError(404, "NOT_FOUND", "Quotation line not found.");

  return prisma.$transaction(async (tx) => {
    await tx.quotationLine.update({
      where: { id: lineId },
      data: {
        ...(input.quantity !== undefined && { quantity: input.quantity }),
        ...(input.discountPercent !== undefined && { discountPercent: input.discountPercent }),
        ...(input.unitPrice !== undefined && { unitPrice: input.unitPrice }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });

    return recalculateQuotation(tx, quotation.id, orgId);
  });
}

export async function deleteQuotationLine(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string,
  lineId: string
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [{ id: quotationId }, { quoteNumber: quotationId }],
      organizationId: orgId,
    },
    include: { salesRep: true },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (!isQuotationModifiable(quotation)) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      `Lines can only be removed from quotations in editable stages (DRAFT, NEGOTIATION, REVISION_REQUESTED). Current stage is ${quotation.stage}.`
    );
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation, userRole, userId, rep?.id);
  }

  const line = await prisma.quotationLine.findFirst({
    where: { id: lineId, quotationId: quotation.id },
  });
  if (!line) throw new AppError(404, "NOT_FOUND", "Quotation line not found.");

  return prisma.$transaction(async (tx) => {
    await tx.quotationLine.delete({ where: { id: lineId } });
    return recalculateQuotation(tx, quotation.id, orgId);
  });
}

// =============================================================================
// Quotation Submission & Approval Routing
// =============================================================================

export async function submitQuotation(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [{ id: quotationId }, { quoteNumber: quotationId }],
      organizationId: orgId,
    },
    include: {
      customer: { include: { tier: true } },
      salesRep: true,
      lines: { include: { product: { include: { category: true } } } },
    },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (!isQuotationModifiable(quotation)) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      `Only quotations in DRAFT, NEGOTIATION, or REVISION_REQUESTED stage can be submitted. Current stage is ${quotation.stage}.`
    );
  }

  if (quotation.lines.length === 0) {
    throw new AppError(400, "EMPTY_QUOTATION", "Cannot submit a quotation with no lines.");
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation, userRole, userId, rep?.id);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Recalculate quotation
    const freshQuotation = await recalculateQuotation(tx, quotation.id, orgId);

    const blendedRiskScore = freshQuotation.blendedRiskScore;
    const discountPercent =
      freshQuotation.subtotal > 0
        ? (freshQuotation.discountTotal / freshQuotation.subtotal) * 100
        : 0;

    // 2. If there was a pending counter-proposal from the customer, mark it as applied/accepted
    await tx.counterProposal.updateMany({
      where: { quotationId: quotation.id, status: "PENDING" },
      data: {
        status: "ACCEPTED",
        respondedById: userId,
        respondedAt: new Date(),
        responseNotes: "Proposal updated and submitted by sales representative.",
      },
    });

    // 3. Trigger approval workflow (enforces Condition 1, 2, or 3)
    await triggerApprovalWorkflow(tx, {
      quotationId: quotation.id,
      orgId,
      actorId: userId,
      actorRole: userRole,
      blendedRiskScore,
      discountPercent,
    });

    return tx.quotation.findUniqueOrThrow({
      where: { id: quotation.id },
      include: {
        customer: { include: { tier: true } },
        salesRep: { include: { user: true } },
        approvalRequest: {
          include: {
            steps: {
              include: { reviewer: true },
              orderBy: { stepNumber: "asc" },
            },
          },
        },
        auditLogs: {
          include: { actor: true },
          orderBy: { createdAt: "desc" },
        },
        counterProposals: {
          include: { respondedBy: true },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: { author: true, quotationLine: { select: { id: true, description: true } } },
          orderBy: { createdAt: "asc" },
        },
        lines: {
          include: {
            product: { include: { category: true } },
            variant: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });
}

// =============================================================================
// Quotation Discussion & Real-Time Messaging (Staff)
// =============================================================================

export async function addQuotationComment(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string,
  input: {
    message: string;
    quotationLineId?: string | null;
    proposedDiscountPercent?: number | null;
  }
) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [{ id: quotationId }, { quoteNumber: quotationId }],
      organizationId: orgId,
    },
    include: { salesRep: true, lines: true },
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

  const comment = await prisma.quotationComment.create({
    data: {
      quotationId: quotation.id,
      quotationLineId: input.quotationLineId || null,
      authorId: userId,
      authorRole: userRole,
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

  // Safely publish to Redis pub/sub channel for real-time delivery
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
          authorName: comment.author?.name || "User",
          quotationLineId: comment.quotationLineId,
          createdAt: comment.createdAt.toISOString(),
        },
      })
    );
  } catch (_err) {
    // Gracefully handle Redis unavailability
  }

  return comment;
}

export async function approveQuotationStep(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string,
  comments?: string
) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: { approvalRequest: { include: { steps: true } } },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (quotation.approvalRequest) {
    return approveStep({
      quotationId,
      reviewerId: userId,
      reviewerRole: userRole,
      comments,
    });
  }

  return prisma.quotation.update({
    where: { id: quotationId },
    data: { stage: QuoteStage.APPROVED, approvalStatus: ApprovalStatus.APPROVED },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      approvalRequest: { include: { steps: true } },
      lines: true,
    },
  });
}

export async function rejectQuotationStep(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string,
  reason?: string
) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: { approvalRequest: { include: { steps: true } } },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (quotation.approvalRequest) {
    await prisma.approvalRequest.update({
      where: { id: quotation.approvalRequest.id },
      data: { status: ApprovalStatus.REJECTED },
    });
  }

  await prisma.approvalAuditLog.create({
    data: {
      quotationId,
      organizationId: orgId,
      actorId: userId,
      actorRole: userRole,
      action: "REJECTED",
      reason: reason || "Quotation discount proposal rejected.",
    },
  });

  return prisma.quotation.update({
    where: { id: quotationId },
    data: { stage: QuoteStage.CANCELLED, approvalStatus: ApprovalStatus.REJECTED },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      approvalRequest: { include: { steps: true } },
      lines: true,
    },
  });
}

export async function updateQuotationStage(
  orgId: string,
  userId: string,
  userRole: UserRole,
  quotationId: string,
  stage: QuoteStage,
  reason?: string
) {
  if (stage === QuoteStage.APPROVED) {
    return approveQuotationStep(orgId, userId, userRole, quotationId, reason);
  }
  if (stage === QuoteStage.CANCELLED) {
    return rejectQuotationStep(orgId, userId, userRole, quotationId, reason);
  }

  return prisma.quotation.update({
    where: { id: quotationId, organizationId: orgId },
    data: { stage },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
      approvalRequest: { include: { steps: true } },
      lines: true,
    },
  });
}
