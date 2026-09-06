import { z } from "zod";

export const CreateQuotationCommentSchema = z.object({
  quotationLineId: z.string().optional().nullable(),
  message: z.string().min(1, "Message cannot be empty"),
  proposedDiscountPercent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional()
    .nullable(),
  authorName: z.string().optional(),
  authorEmail: z.string().email("Invalid email format").optional(),
});

export const CreateCounterProposalSchema = z.object({
  proposedGrandTotal: z.number().min(0, "Proposed total must be non-negative").optional(),
  proposedDiscountPercent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  proposedDiscount: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  customerNotes: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  authorName: z.string().optional(),
  authorEmail: z.string().optional(),
  requestedDeliveryDate: z.string().optional().nullable(),
  lineDiscounts: z
    .array(
      z.object({
        lineId: z.string().min(1, "Line ID is required"),
        proposedDiscountPercent: z
          .number()
          .min(0, "Discount cannot be negative")
          .max(100, "Discount cannot exceed 100%"),
      })
    )
    .optional(),
});

export const ConfirmQuotationSchema = z.object({
  customerNotes: z.string().optional().nullable(),
  customerName: z.string().optional(),
  customerEmail: z.string().email("Invalid email format").optional(),
  agreedToTerms: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const SignQuotationSchema = z.object({
  signedByName: z.string().optional(),
  signerName: z.string().optional(),
  signedByEmail: z.string().optional(),
  signerEmail: z.string().optional(),
  signerTitle: z.string().optional(),
  signatureData: z.string().min(1, "Signature stroke data or base64 image is required"),
});

export const AcceptCounterProposalSchema = z.object({
  notes: z.string().optional().nullable(),
  overrideThreshold: z.boolean().optional().default(false),
});

export const RejectCounterProposalSchema = z.object({
  responseNotes: z.string().optional().nullable(),
});

export type CreateQuotationCommentInput = z.infer<typeof CreateQuotationCommentSchema>;
export type CreateCounterProposalInput = z.infer<typeof CreateCounterProposalSchema>;
export type ConfirmQuotationInput = z.infer<typeof ConfirmQuotationSchema>;
export type SignQuotationInput = z.infer<typeof SignQuotationSchema>;
export type AcceptCounterProposalInput = z.infer<typeof AcceptCounterProposalSchema>;
export type RejectCounterProposalInput = z.infer<typeof RejectCounterProposalSchema>;
