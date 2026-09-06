import { z } from "zod";
import {
  InvoiceStatus,
  SubscriptionStatus,
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

export const CreateSubscriptionSchema = z.object({
  customerId: z.string().min(1, { message: "Customer ID is required" }),
  productId: z.string().min(1, { message: "Product ID is required" }),
  variantId: z.string().optional().nullable(),
  planName: z.string().optional(),
  billingInterval: z.nativeEnum(BillingInterval).optional().default(BillingInterval.MONTHLY),
  unitPrice: z.number().positive({ message: "Unit price must be positive" }),
  quantity: z.number().int().positive().optional().default(1),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  startDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  autoRenew: z.boolean().optional().default(true),
  enableReminder: z.boolean().optional().default(true),
});

export const ModifySubscriptionSchema = z.object({
  billingInterval: z.nativeEnum(BillingInterval).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  nextBillingDate: z.coerce.date().optional(),
  autoRenew: z.boolean().optional(),
  notes: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  unitPrice: z.number().positive().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
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

export const ScheduleReminderSchema = z.object({
  reminderDaysBefore: z.number().int().min(1).max(90).optional().default(7),
  manualTrigger: z.boolean().optional().default(false),
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
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type ModifySubscriptionInput = z.infer<typeof ModifySubscriptionSchema>;
export type UpdateSubscriptionLineInput = z.infer<typeof UpdateSubscriptionLineSchema>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
export type ScheduleReminderInput = z.infer<typeof ScheduleReminderSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type QueryInvoicesInput = z.infer<typeof QueryInvoicesSchema>;
export type QueryCreditNotesInput = z.infer<typeof QueryCreditNotesSchema>;
