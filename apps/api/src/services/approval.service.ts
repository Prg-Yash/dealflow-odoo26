import {
  prisma,
  ApprovalLevel,
  ApprovalStatus,
  QuoteStage,
  UserRole,
  type Prisma,
} from "@repo/db";
import { AppError } from "../middleware/error.js";

export interface EvaluateApprovalResult {
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  escalationLevel: string;
}

/**
 * Evaluates DiscountApprovalRule records for an organization based on risk score and discount percent.
 */
export async function evaluateApprovalRules(
  orgId: string,
  blendedRiskScore: number,
  discountPercent: number
): Promise<EvaluateApprovalResult> {
  const rules = await prisma.discountApprovalRule.findMany({
    where: { organizationId: orgId },
  });

  let requiresManagerApproval = false;
  let requiresFinanceApproval = false;

  for (const rule of rules) {
    // If the rule requires Finance approval (2 Hops: Manager + Finance)
    if (rule.requiresFinanceApproval) {
      const triggered =
        blendedRiskScore >= rule.minBlendedRiskScore ||
        discountPercent >= rule.minDiscountPercent;
      if (triggered) {
        requiresManagerApproval = true;
        requiresFinanceApproval = true;
      }
    } else if (rule.requiresManagerApproval) {
      // 1 Hop: Sales Manager
      const triggered =
        blendedRiskScore >= rule.minBlendedRiskScore ||
        discountPercent >= rule.minDiscountPercent;
      if (triggered) {
        requiresManagerApproval = true;
      }
    }
  }

  // Baseline Guardrails (Condition 1, Condition 2, Condition 3)
  if (blendedRiskScore > 10.0 || discountPercent > 15.0) {
    // Severe / High Risk -> Condition 3 (2 Hops: Sales Manager + Finance)
    requiresManagerApproval = true;
    requiresFinanceApproval = true;
  } else if (blendedRiskScore > 0 || discountPercent > 0) {
    // Moderate Risk -> Condition 2 (1 Hop: Sales Manager)
    requiresManagerApproval = true;
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

/**
 * Creates or refreshes an ApprovalRequest for a quotation, generating necessary steps
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

  // If no approval is required according to rules, quotation can be auto-approved
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
        reason: reason || "Discounts within standard policy thresholds.",
        metadata: { blendedRiskScore, discountPercent, ...metadata },
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
  await tx.approvalAuditLog.create({
    data: {
      quotationId,
      organizationId: orgId,
      actorId,
      actorRole,
      action: "SUBMITTED_FOR_APPROVAL",
      reason:
        reason ||
        `Discount of ${discountPercent.toFixed(1)}% / Blended Risk ${blendedRiskScore.toFixed(1)} triggered approval workflow.`,
      metadata: {
        blendedRiskScore,
        discountPercent,
        escalationLevel,
        steps: stepsToCreate.map((s) => s.level),
        ...metadata,
      },
    },
  });

  return approvalRequest;
}

/**
 * Action approval on an active ApprovalStep by an authorized manager or finance user.
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

      // Advance quotation to APPROVED (or NEGOTIATION if customer portal is active)
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          stage: QuoteStage.APPROVED,
          approvalStatus: ApprovalStatus.APPROVED,
        },
      });
    } else {
      // Advance to next step
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

    return tx.quotation.findUnique({
      where: { id: quotationId },
      include: {
        approvalRequest: { include: { steps: true } },
        lines: true,
      },
    });
  });
}
