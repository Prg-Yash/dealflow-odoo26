import { z } from "zod";
import {
  InvoiceStatus,
  BillingInterval,
  PaymentMethod,
  CreditNoteStatus,
} from "@repo/db";

export const ConfirmQuotationSchema = z.object({
  paymentTerms: z.string().optional().default("Net 30"),
  notes: z.string().optional(),
  billingInterval: z.nativeEnum(BillingInterval).optional().default(BillingInterval.MONTHLY),
  startDate: z.coerce.date().optional(),
});

export const UpdateSubscriptionLineSchema = z.object({
  quantity: z.number().int().positive({ message: "Quantity must be a positive integer" }),
  asOfDate: z.coerce.date().optional(),
});

export const CancelSubscriptionSchema = z.object({
  refundRule: z.enum(["PRORATED", "FULL", "NO_REFUND"]).optional().default("PRORATED"),
  reason: z.string().optional(),
  notes: z.string().optional(),
  asOfDate: z.coerce.date().optional(),
});

export const RecordPaymentSchema = z.object({
  amount: z.number().positive({ message: "Payment amount must be greater than zero" }),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.ACH),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.coerce.date().optional(),
});

export const QueryInvoicesSchema = z.object({
  customerId: z.string().optional(),
  subscriptionId: z.string().optional(),
  quotationId: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const QueryCreditNotesSchema = z.object({
  customerId: z.string().optional(),
  subscriptionId: z.string().optional(),
  invoiceId: z.string().optional(),
  status: z.nativeEnum(CreditNoteStatus).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type ConfirmQuotationInput = z.infer<typeof ConfirmQuotationSchema>;
export type UpdateSubscriptionLineInput = z.infer<typeof UpdateSubscriptionLineSchema>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type QueryInvoicesInput = z.infer<typeof QueryInvoicesSchema>;
export type QueryCreditNotesInput = z.infer<typeof QueryCreditNotesSchema>;
