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
  return prisma.salesRepresentative.findFirst({
    where: { userId, organizationId: orgId },
  });
}

function verifyRepOwnership(
  quotationSalesRepId: string,
  userRole: UserRole,
  userSalesRepId?: string
) {
  if (userRole === UserRole.SALES_REP) {
    if (!userSalesRepId || quotationSalesRepId !== userSalesRepId) {
      throw new AppError(403, "FORBIDDEN", "You can only manage your own quotations.");
    }
  }
}

/**
 * Recomputes all line margins, overage, risk points and quotation aggregates
 * atomically inside a Prisma transaction.
 */
async function recalculateQuotation(
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

// =============================================================================
// Quotation CRUD Services
// =============================================================================

export async function createQuotation(
  orgId: string,
  userId: string,
  userRole: UserRole,
  input: CreateQuotationInput
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId: orgId },
    include: { tier: true, salesRep: true },
  });
  if (!customer) throw new AppError(404, "NOT_FOUND", "Customer not found.");

  let salesRepId: string | undefined;

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    if (rep) salesRepId = rep.id;
  }

  if (!salesRepId && input.salesRepId) {
    const rep = await prisma.salesRepresentative.findFirst({
      where: { id: input.salesRepId, organizationId: orgId },
    });
    if (rep) salesRepId = rep.id;
  }

  if (!salesRepId && customer.salesRepId) {
    salesRepId = customer.salesRepId;
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

  return prisma.quotation.create({
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
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
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
      OR: [{ id }, { quoteNumber: id }],
      organizationId: orgId,
    },
    include: {
      customer: { include: { tier: true } },
      salesRep: { include: { user: true } },
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

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation.salesRepId, userRole, rep?.id);
  }

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
    where: { id: quotationId, organizationId: orgId },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (quotation.stage !== QuoteStage.DRAFT) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      "Lines can only be added to quotations in DRAFT stage."
    );
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation.salesRepId, userRole, rep?.id);
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
    where: { quotationId },
  });

  return prisma.$transaction(async (tx) => {
    await tx.quotationLine.create({
      data: {
        quotationId,
        productId: product.id,
        variantId: variant?.id,
        itemType: input.itemType ?? product.category.type,
        description: input.description ?? product.name,
        quantity: input.quantity,
        unitPrice,
        costPrice,
        discountPercent: input.discountPercent,
        sortOrder: lineCount,
      },
    });

    return recalculateQuotation(tx, quotationId, orgId);
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
    where: { id: quotationId, organizationId: orgId },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (quotation.stage !== QuoteStage.DRAFT) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      "Lines can only be updated for quotations in DRAFT stage."
    );
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation.salesRepId, userRole, rep?.id);
  }

  const line = await prisma.quotationLine.findFirst({
    where: { id: lineId, quotationId },
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

    return recalculateQuotation(tx, quotationId, orgId);
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
    where: { id: quotationId, organizationId: orgId },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (quotation.stage !== QuoteStage.DRAFT) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      "Lines can only be removed from quotations in DRAFT stage."
    );
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation.salesRepId, userRole, rep?.id);
  }

  const line = await prisma.quotationLine.findFirst({
    where: { id: lineId, quotationId },
  });
  if (!line) throw new AppError(404, "NOT_FOUND", "Quotation line not found.");

  return prisma.$transaction(async (tx) => {
    await tx.quotationLine.delete({ where: { id: lineId } });
    return recalculateQuotation(tx, quotationId, orgId);
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
    where: { id: quotationId, organizationId: orgId },
    include: {
      customer: { include: { tier: true } },
      lines: { include: { product: { include: { category: true } } } },
    },
  });
  if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");

  if (quotation.stage !== QuoteStage.DRAFT) {
    throw new AppError(
      400,
      "INVALID_STAGE",
      `Only quotations in DRAFT stage can be submitted. Current stage is ${quotation.stage}.`
    );
  }

  if (quotation.lines.length === 0) {
    throw new AppError(400, "EMPTY_QUOTATION", "Cannot submit a quotation with no lines.");
  }

  if (userRole === UserRole.SALES_REP) {
    const rep = await getSalesRepForUser(orgId, userId);
    verifyRepOwnership(quotation.salesRepId, userRole, rep?.id);
  }

  // Ensure fresh recalculation
  const freshQuotation = await prisma.$transaction(async (tx) => {
    return recalculateQuotation(tx, quotationId, orgId);
  });

  const blendedRiskScore = freshQuotation.blendedRiskScore;
  const discountPercent =
    freshQuotation.subtotal > 0
      ? (freshQuotation.discountTotal / freshQuotation.subtotal) * 100
      : 0;

  // Evaluate DiscountApprovalRule records for this organization
  const rules = await prisma.discountApprovalRule.findMany({
    where: { organizationId: orgId },
  });

  let requiresManagerApproval = false;
  let requiresFinanceApproval = false;

  for (const rule of rules) {
    const matchesRisk =
      blendedRiskScore >= rule.minBlendedRiskScore &&
      blendedRiskScore <= rule.maxBlendedRiskScore;

    const matchesDiscount =
      discountPercent >= rule.minDiscountPercent &&
      discountPercent <= rule.maxDiscountPercent;

    if (matchesRisk && matchesDiscount) {
      if (rule.requiresManagerApproval) requiresManagerApproval = true;
      if (rule.requiresFinanceApproval) requiresFinanceApproval = true;
    }
  }

  const requiresApproval = requiresManagerApproval || requiresFinanceApproval;
  const newStage = requiresApproval ? QuoteStage.PENDING_APPROVAL : QuoteStage.APPROVED;
  const newApprovalStatus = requiresApproval ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED;

  return prisma.quotation.update({
    where: { id: quotationId },
    data: {
      stage: newStage,
      approvalStatus: newApprovalStatus,
      requiresManagerApproval,
      requiresFinanceApproval,
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
