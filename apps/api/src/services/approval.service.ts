import {
  prisma,
  ApprovalLevel,
  ApprovalStatus,
  QuoteStage,
  UserRole,
  type Prisma,
} from "@repo/db";
import { AppError } from "../middleware/error.js";
import { calculateBlendedRisk, type RiskLineInput } from "../lib/risk-engine.js";

export interface EvaluateApprovalResult {
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  escalationLevel: string;
}

export interface LineAdjustmentInput {
  lineId: string;
  discountPercent?: number;
  unitPrice?: number;
  quantity?: number;
}

/**
 * Recomputes all line margins, overage, risk points and quotation aggregates
 * atomically inside a Prisma transaction.
 */
export async function recalculateQuotationTx(
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

/**
 * Evaluates DiscountApprovalRule records for an organization based on risk score and discount percent.
 * Defaults to 3-condition baseline governance if no explicit rule records match.
 */
export async function evaluateApprovalRules(
  orgId: string,
  blendedRiskScore: number,
  discountPercent: number
): Promise<EvaluateApprovalResult> {
  const rules = await prisma.discountApprovalRule.findMany({
    where: { organizationId: orgId },
  });

  if (rules.length > 0) {
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

    let escalationLevel = "NONE";
    if (requiresManagerApproval && requiresFinanceApproval) {
      escalationLevel = "SALES_MANAGER_AND_FINANCE";
    } else if (requiresManagerApproval) {
      escalationLevel = "SALES_MANAGER";
    } else if (requiresFinanceApproval) {
      escalationLevel = "FINANCE";
    }

    return {
      requiresManagerApproval,
      requiresFinanceApproval,
      escalationLevel,
    };
  }

  // Baseline 3-Condition Logic:
  // Condition 1 (0 Hops): Blended Risk = 0 & Discount <= 5% -> Auto-approved (0 Hops)
  // Condition 2 (1 Hop): Blended Risk <= 10 & Discount <= 15% -> Sales Manager
  // Condition 3 (2 Hops): Blended Risk > 10 OR Discount > 15% -> Manager + Finance
  if (blendedRiskScore === 0 && discountPercent <= 5.0) {
    return {
      requiresManagerApproval: false,
      requiresFinanceApproval: false,
      escalationLevel: "NONE",
    };
  } else if (blendedRiskScore <= 10.0 && discountPercent <= 15.0) {
    return {
      requiresManagerApproval: true,
      requiresFinanceApproval: false,
      escalationLevel: "SALES_MANAGER",
    };
  } else {
    return {
      requiresManagerApproval: true,
      requiresFinanceApproval: true,
      escalationLevel: "SALES_MANAGER_AND_FINANCE",
    };
  }
}

/**
 * Creates or refreshes an ApprovalRequest for a quotation, generating necessary sequential steps
 * and recording an audit log entry.
 */
export async function triggerApprovalWorkflow(
  tx: Prisma.TransactionClient,
  params: {
    quotationId: string;
    orgId: string;
    actorId: string;
    actorRole: UserRole;
    blendedRiskScore: number;
    discountPercent: number;
    reason?: string;
    requiresManagerApproval?: boolean;
    requiresFinanceApproval?: boolean;
    metadata?: Record<string, any>;
  }
) {
  const {
    quotationId,
    orgId,
    actorId,
    actorRole,
    blendedRiskScore,
    discountPercent,
    reason,
    metadata = {},
  } = params;

  const evaluation = await evaluateApprovalRules(orgId, blendedRiskScore, discountPercent);

  const reqManager =
    params.requiresManagerApproval !== undefined
      ? params.requiresManagerApproval
      : evaluation.requiresManagerApproval;

  const reqFinance =
    params.requiresFinanceApproval !== undefined
      ? params.requiresFinanceApproval
      : evaluation.requiresFinanceApproval;

  let escalationLevel = "NONE";
  if (reqManager && reqFinance) {
    escalationLevel = "SALES_MANAGER_AND_FINANCE";
  } else if (reqManager) {
    escalationLevel = "SALES_MANAGER";
  } else if (reqFinance) {
    escalationLevel = "FINANCE";
  }

  // Condition 1: If no approval is required (0 Hops), quotation is auto-approved directly for customer
  if (!reqManager && !reqFinance) {
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        stage: QuoteStage.APPROVED,
        approvalStatus: ApprovalStatus.APPROVED,
        requiresManagerApproval: false,
        requiresFinanceApproval: false,
      },
    });

    await tx.approvalAuditLog.create({
      data: {
        quotationId,
        organizationId: orgId,
        actorId,
        actorRole,
        action: "AUTO_APPROVED",
        reason: reason || "Condition 1 met: Zero overage risk and discount within standard 5% discretion (0 Hops).",
        metadata: { blendedRiskScore, discountPercent, ...metadata },
      },
    });

    await tx.quotationComment.create({
      data: {
        quotationId,
        authorId: actorId,
        authorRole: actorRole,
        message: `Commercial proposal submitted and auto-approved (Condition 1: 0 Hops). Discount is within standard discretion (0% overage). Terms are immediately available for customer acceptance.`,
        isResolved: true,
      },
    });

    return null;
  }

  // Delete prior approval request & steps if any
  await tx.approvalRequest.deleteMany({ where: { quotationId } });

  const approvalRequest = await tx.approvalRequest.create({
    data: {
      quotationId,
      status: ApprovalStatus.PENDING,
      escalationLevel,
      currentStep: 1,
      blendedRiskScore,
    },
  });

  const stepsToCreate: Array<{
    stepNumber: number;
    level: ApprovalLevel;
    status: ApprovalStatus;
  }> = [];

  if (reqManager) {
    stepsToCreate.push({
      stepNumber: 1,
      level: ApprovalLevel.SALES_MANAGER,
      status: ApprovalStatus.PENDING,
    });
  }

  if (reqFinance) {
    stepsToCreate.push({
      stepNumber: stepsToCreate.length + 1,
      level: ApprovalLevel.FINANCE,
      status: ApprovalStatus.PENDING,
    });
  }

  for (const step of stepsToCreate) {
    await tx.approvalStep.create({
      data: {
        approvalRequestId: approvalRequest.id,
        stepNumber: step.stepNumber,
        level: step.level,
        status: step.status,
      },
    });
  }

  // Update quotation stage to PENDING_APPROVAL
  await tx.quotation.update({
    where: { id: quotationId },
    data: {
      stage: QuoteStage.PENDING_APPROVAL,
      approvalStatus: ApprovalStatus.PENDING,
      requiresManagerApproval: reqManager,
      requiresFinanceApproval: reqFinance,
    },
  });

  // Log audit entry
  const tierDescription =
    reqManager && reqFinance
      ? "Condition 3: Multi-hop Escalation (Sales Manager → Finance Ops)"
      : "Condition 2: 1-Hop Escalation (Sales Manager Sign-off)";

  await tx.approvalAuditLog.create({
    data: {
      quotationId,
      organizationId: orgId,
      actorId,
      actorRole,
      action: "SUBMITTED_FOR_APPROVAL",
      reason:
        reason ||
        `${tierDescription}. Discount: ${discountPercent.toFixed(1)}%, Blended Risk: ${blendedRiskScore.toFixed(1)}.`,
      metadata: {
        blendedRiskScore,
        discountPercent,
        escalationLevel,
        steps: stepsToCreate.map((s) => s.level),
        ...metadata,
      },
    },
  });

  await tx.quotationComment.create({
    data: {
      quotationId,
      authorId: actorId,
      authorRole: actorRole,
      message: `Commercial proposal submitted for review (${tierDescription}). Proposed discount: ${discountPercent.toFixed(1)}% with blended risk score: ${blendedRiskScore.toFixed(1)}%.`,
      isResolved: false,
    },
  });

  return approvalRequest;
}

/**
 * Action approval on an active ApprovalStep by an authorized manager or finance user.
 * Supports sequential 2-hop transitions (Sales Manager -> Finance -> Approved).
 */
export async function approveStep(params: {
  quotationId: string;
  reviewerId: string;
  reviewerRole: UserRole;
  comments?: string;
}) {
  const { quotationId, reviewerId, reviewerRole, comments } = params;

  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: {
        approvalRequest: {
          include: {
            steps: { orderBy: { stepNumber: "asc" } },
          },
        },
      },
    });

    if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");
    if (!quotation.approvalRequest) {
      throw new AppError(400, "NO_APPROVAL_REQUEST", "No active approval request found for this quotation.");
    }

    const currentStepIndex = quotation.approvalRequest.currentStep - 1;
    const currentStep = quotation.approvalRequest.steps[currentStepIndex];

    if (!currentStep || currentStep.status !== ApprovalStatus.PENDING) {
      throw new AppError(400, "INVALID_STEP", "Current approval step is not pending.");
    }

    // Role verification
    if (currentStep.level === ApprovalLevel.SALES_MANAGER) {
      if (reviewerRole !== UserRole.SALES_MANAGER && reviewerRole !== UserRole.ADMIN) {
        throw new AppError(403, "FORBIDDEN", "Only Sales Managers or Administrators can approve this step.");
      }
    } else if (currentStep.level === ApprovalLevel.FINANCE) {
      if (reviewerRole !== UserRole.FINANCE_OPS && reviewerRole !== UserRole.ADMIN) {
        throw new AppError(403, "FORBIDDEN", "Only Finance Operations or Administrators can approve this step.");
      }
    }

    // Mark current step approved
    await tx.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: ApprovalStatus.APPROVED,
        reviewerId,
        comments,
        actionedAt: new Date(),
      },
    });

    const isFinalStep = currentStepIndex === quotation.approvalRequest.steps.length - 1;

    if (isFinalStep) {
      // Mark entire request approved
      await tx.approvalRequest.update({
        where: { id: quotation.approvalRequest.id },
        data: { status: ApprovalStatus.APPROVED },
      });

      // Advance quotation to APPROVED (ready for customer review)
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          stage: QuoteStage.APPROVED,
          approvalStatus: ApprovalStatus.APPROVED,
        },
      });
    } else {
      // Advance to next step (e.g. Step 2 Finance)
      await tx.approvalRequest.update({
        where: { id: quotation.approvalRequest.id },
        data: { currentStep: quotation.approvalRequest.currentStep + 1 },
      });
    }

    // Record audit log
    await tx.approvalAuditLog.create({
      data: {
        quotationId,
        organizationId: quotation.organizationId,
        actorId: reviewerId,
        actorRole: reviewerRole,
        action: currentStep.level === ApprovalLevel.SALES_MANAGER ? "APPROVED_BY_MANAGER" : "APPROVED_BY_FINANCE",
        reason: comments || `Step ${currentStep.stepNumber} approved by ${reviewerRole}.`,
        metadata: {
          stepNumber: currentStep.stepNumber,
          level: currentStep.level,
          isFinalStep,
        },
      },
    });

    await tx.quotationComment.create({
      data: {
        quotationId,
        authorId: reviewerId,
        authorRole: reviewerRole,
        message: isFinalStep
          ? `Approval sign-off granted by ${reviewerRole === "SALES_MANAGER" ? "Sales Manager" : reviewerRole}. Quotation is now APPROVED and ready for customer execution.`
          : `Step ${currentStep.stepNumber} (${currentStep.level.replace(/_/g, " ")}) approved. Escalated to next review step.`,
        isResolved: isFinalStep,
      },
    });

    return tx.quotation.findUnique({
      where: { id: quotationId },
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
            product: { include: { category: true } },
            variant: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });
}

/**
 * Action rejection / revision request on an active ApprovalStep by an authorized reviewer.
 * Optionally applies line discount adjustments and returns quotation to DRAFT / REVISION_REQUESTED.
 */
export async function rejectStep(params: {
  quotationId: string;
  reviewerId: string;
  reviewerRole: UserRole;
  comments?: string;
  lineAdjustments?: LineAdjustmentInput[];
}) {
  const { quotationId, reviewerId, reviewerRole, comments, lineAdjustments } = params;

  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: {
        approvalRequest: {
          include: {
            steps: { orderBy: { stepNumber: "asc" } },
          },
        },
        lines: {
          include: {
            product: { include: { category: true } },
          },
        },
        customer: { include: { tier: true } },
      },
    });

    if (!quotation) throw new AppError(404, "NOT_FOUND", "Quotation not found.");
    if (!quotation.approvalRequest) {
      throw new AppError(400, "NO_APPROVAL_REQUEST", "No active approval request found for this quotation.");
    }

    const currentStepIndex = quotation.approvalRequest.currentStep - 1;
    const currentStep = quotation.approvalRequest.steps[currentStepIndex];

    if (!currentStep || currentStep.status !== ApprovalStatus.PENDING) {
      throw new AppError(400, "INVALID_STEP", "Current approval step is not pending.");
    }

    // Role verification
    if (currentStep.level === ApprovalLevel.SALES_MANAGER) {
      if (reviewerRole !== UserRole.SALES_MANAGER && reviewerRole !== UserRole.ADMIN) {
        throw new AppError(403, "FORBIDDEN", "Only Sales Managers or Administrators can review this step.");
      }
    } else if (currentStep.level === ApprovalLevel.FINANCE) {
      if (reviewerRole !== UserRole.FINANCE_OPS && reviewerRole !== UserRole.ADMIN) {
        throw new AppError(403, "FORBIDDEN", "Only Finance Operations or Administrators can review this step.");
      }
    }

    // If reviewer suggested line adjustments, apply them
    if (lineAdjustments && lineAdjustments.length > 0) {
      for (const adj of lineAdjustments) {
        const line = quotation.lines.find((l) => l.id === adj.lineId);
        if (line) {
          await tx.quotationLine.update({
            where: { id: adj.lineId },
            data: {
              ...(adj.discountPercent !== undefined ? { discountPercent: adj.discountPercent } : {}),
              ...(adj.unitPrice !== undefined ? { unitPrice: adj.unitPrice } : {}),
              ...(adj.quantity !== undefined ? { quantity: adj.quantity } : {}),
            },
          });
        }
      }
    }

    // Mark current step as REVISION_REQUESTED / REJECTED
    await tx.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: ApprovalStatus.REVISION_REQUESTED,
        reviewerId,
        comments: comments || "Revision requested by reviewer.",
        actionedAt: new Date(),
      },
    });

    // Mark approval request as REVISION_REQUESTED
    await tx.approvalRequest.update({
      where: { id: quotation.approvalRequest.id },
      data: { status: ApprovalStatus.REVISION_REQUESTED },
    });

    // Recalculate quotation financials with adjusted values
    await recalculateQuotationTx(tx, quotationId, quotation.organizationId);

    // Update quotation stage back to DRAFT and approvalStatus to REVISION_REQUESTED
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        stage: QuoteStage.DRAFT,
        approvalStatus: ApprovalStatus.REVISION_REQUESTED,
      },
    });

    // Record audit log
    await tx.approvalAuditLog.create({
      data: {
        quotationId,
        organizationId: quotation.organizationId,
        actorId: reviewerId,
        actorRole: reviewerRole,
        action: currentStep.level === ApprovalLevel.SALES_MANAGER ? "REVISION_REQUESTED_BY_MANAGER" : "REVISION_REQUESTED_BY_FINANCE",
        reason: comments || `Revision requested by ${reviewerRole}.`,
        metadata: {
          stepNumber: currentStep.stepNumber,
          level: currentStep.level,
          lineAdjustments: lineAdjustments || [],
        },
      },
    });

    await tx.quotationComment.create({
      data: {
        quotationId,
        authorId: reviewerId,
        authorRole: reviewerRole,
        message: `Revision requested by ${reviewerRole === "SALES_MANAGER" ? "Sales Manager" : reviewerRole}: ${comments || "Please review line item discounts and adjust proposal."}`,
        isResolved: false,
      },
    });

    return tx.quotation.findUnique({
      where: { id: quotationId },
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
            product: { include: { category: true } },
            variant: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });
}

/**
 * Lists pending approvals requiring review by the requesting user or role.
 */
export async function listPendingApprovals(
  orgId: string,
  _userId: string,
  userRole: UserRole
) {
  let targetLevel: ApprovalLevel | undefined;

  if (userRole === UserRole.SALES_REP) {
    return [];
  } else if (userRole === UserRole.SALES_MANAGER) {
    targetLevel = ApprovalLevel.SALES_MANAGER;
  } else if (userRole === UserRole.FINANCE_OPS) {
    targetLevel = ApprovalLevel.FINANCE;
  }

  const quotations = await prisma.quotation.findMany({
    where: {
      organizationId: orgId,
      stage: QuoteStage.PENDING_APPROVAL,
      approvalStatus: ApprovalStatus.PENDING,
      approvalRequest: {
        status: ApprovalStatus.PENDING,
        ...(targetLevel
          ? {
              steps: {
                some: {
                  level: targetLevel,
                  status: ApprovalStatus.PENDING,
                },
              },
            }
          : {}),
      },
    },
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
          product: { include: { category: true } },
          variant: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return quotations;
}
