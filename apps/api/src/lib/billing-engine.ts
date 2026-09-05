export type RefundRule = "PRORATED" | "FULL" | "NO_REFUND";

export interface ProrationScheduleResult {
  deltaQuantity: number;
  unitPrice: number;
  cycleLengthDays: number;
  daysElapsed: number;
  daysRemaining: number;
  proratedAmount: number;
  isExpansion: boolean;
  isReduction: boolean;
  adjustmentType: "INVOICE" | "CREDIT_NOTE" | "NO_CHARGE";
}

/**
 * Pure billing engine proration calculation.
 *
 * Computes the signed prorated delta when changing subscription quantity mid-cycle.
 * Formula: (newQty - oldQty) * unitPrice * (daysRemaining / cycleLengthDays)
 *
 * @param oldQty - Current seat count / quantity
 * @param newQty - Desired new seat count / quantity
 * @param unitPrice - Unit price per billing cycle
 * @param cycleLengthDays - Total days in the current billing cycle
 * @param daysElapsed - Days elapsed in the current cycle
 * @returns Signed amount: positive for increase (charge), negative for decrease (credit), rounded to 2 decimal places
 */
export function prorate(
  oldQty: number,
  newQty: number,
  unitPrice: number,
  cycleLengthDays: number,
  daysElapsed: number
): number {
  if (cycleLengthDays <= 0 || unitPrice <= 0) {
    return 0;
  }

  const clampedElapsed = Math.min(Math.max(0, daysElapsed), cycleLengthDays);
  const daysRemaining = Math.max(0, cycleLengthDays - clampedElapsed);
  const deltaQty = newQty - oldQty;

  const rawAmount = deltaQty * unitPrice * (daysRemaining / cycleLengthDays);
  return Math.round(rawAmount * 100) / 100;
}

/**
 * Calculates a complete mid-cycle proration schedule for subscription line alterations.
 */
export function calculateProrationSchedule(
  oldQty: number,
  newQty: number,
  unitPrice: number,
  periodStart: Date,
  periodEnd: Date,
  changeDate: Date = new Date()
): ProrationScheduleResult {
  const msInDay = 1000 * 60 * 60 * 24;
  const cycleLengthDays = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / msInDay)
  );
  const daysElapsed = Math.max(
    0,
    Math.round((changeDate.getTime() - periodStart.getTime()) / msInDay)
  );
  const clampedElapsed = Math.min(daysElapsed, cycleLengthDays);
  const daysRemaining = Math.max(0, cycleLengthDays - clampedElapsed);

  const proratedAmount = prorate(
    oldQty,
    newQty,
    unitPrice,
    cycleLengthDays,
    clampedElapsed
  );

  const deltaQuantity = newQty - oldQty;
  const isExpansion = deltaQuantity > 0;
  const isReduction = deltaQuantity < 0;

  let adjustmentType: "INVOICE" | "CREDIT_NOTE" | "NO_CHARGE" = "NO_CHARGE";
  if (proratedAmount > 0) {
    adjustmentType = "INVOICE";
  } else if (proratedAmount < 0) {
    adjustmentType = "CREDIT_NOTE";
  }

  return {
    deltaQuantity,
    unitPrice,
    cycleLengthDays,
    daysElapsed: clampedElapsed,
    daysRemaining,
    proratedAmount,
    isExpansion,
    isReduction,
    adjustmentType,
  };
}

/**
 * Pure billing engine refund calculation on subscription cancellation.
 *
 * Computes refund for unused fraction of the billing cycle.
 * Formula for PRORATED: amountPaidThisCycle * (daysRemaining / cycleLengthDays)
 *
 * @param amountPaidThisCycle - Total charge / amount paid for current cycle
 * @param daysElapsed - Days elapsed in the current cycle
 * @param cycleLengthDays - Total days in the current billing cycle
 * @param refundRule - "PRORATED" | "FULL" | "NO_REFUND" (default: "PRORATED")
 * @returns Refund amount rounded to 2 decimal places (>= 0)
 */
export function refund(
  amountPaidThisCycle: number,
  daysElapsed: number,
  cycleLengthDays: number,
  refundRule: RefundRule | string = "PRORATED"
): number {
  if (amountPaidThisCycle <= 0) {
    return 0;
  }

  if (refundRule === "NO_REFUND") {
    return 0;
  }

  if (refundRule === "FULL") {
    return Math.round(amountPaidThisCycle * 100) / 100;
  }

  // PRORATED (default)
  if (cycleLengthDays <= 0) {
    return 0;
  }

  const clampedElapsed = Math.min(Math.max(0, daysElapsed), cycleLengthDays);
  const daysRemaining = Math.max(0, cycleLengthDays - clampedElapsed);
  const rawRefund = amountPaidThisCycle * (daysRemaining / cycleLengthDays);

  return Math.round(Math.max(0, rawRefund) * 100) / 100;
}

/**
 * Calculates normalized MRR and ARR based on recurring total amount and billing interval.
 */
export function calculateMrrArr(
  recurringTotal: number,
  interval: "MONTHLY" | "QUARTERLY" | "ANNUALLY"
): { mrr: number; arr: number } {
  const roundedTotal = Math.round(recurringTotal * 100) / 100;

  switch (interval) {
    case "MONTHLY":
      return {
        mrr: roundedTotal,
        arr: Math.round(roundedTotal * 12 * 100) / 100,
      };
    case "QUARTERLY":
      return {
        mrr: Math.round((roundedTotal / 3) * 100) / 100,
        arr: Math.round(roundedTotal * 4 * 100) / 100,
      };
    case "ANNUALLY":
      return {
        mrr: Math.round((roundedTotal / 12) * 100) / 100,
        arr: roundedTotal,
      };
    default:
      return {
        mrr: roundedTotal,
        arr: Math.round(roundedTotal * 12 * 100) / 100,
      };
  }
}
