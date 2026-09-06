import { z } from "zod";
import { CategoryType, QuoteStage } from "@repo/db";

export const CreateQuotationSchema = z.object({
  customerId: z.string().optional(),
  customerEmail: z.string().email("Valid customer email is required").optional(),
  customerName: z.string().optional(),
  companyName: z.string().optional(),
  customerPhone: z.string().optional(),
  tierId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  salesRepId: z.string().optional(),
  quoteNumber: z.string().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
        unitPrice: z.number().min(0, "Unit price must be non-negative").optional(),
        discountPercent: z.number().min(0).max(100, "Discount cannot exceed 100%").default(0.0),
        description: z.string().optional(),
        itemType: z.nativeEnum(CategoryType).optional(),
      })
    )
    .optional(),
});

export const CreateQuotationLineSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  unitPrice: z.number().min(0, "Unit price must be non-negative").optional(),
  discountPercent: z.number().min(0).max(100, "Discount cannot exceed 100%").default(0.0),
  description: z.string().optional(),
  itemType: z.nativeEnum(CategoryType).optional(),
});

export const UpdateQuotationLineSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
  discountPercent: z.number().min(0).max(100, "Discount cannot exceed 100%").optional(),
  unitPrice: z.number().min(0, "Unit price must be non-negative").optional(),
  description: z.string().optional(),
});

export const QuotationQuerySchema = z.object({
  customerId: z.string().optional(),
  stage: z.nativeEnum(QuoteStage).optional(),
  salesRepId: z.string().optional(),
});

export const CreateQuotationStaffCommentSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  quotationLineId: z.string().optional().nullable(),
  proposedDiscountPercent: z.number().min(0).max(100).optional().nullable(),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
export type CreateQuotationLineInput = z.infer<typeof CreateQuotationLineSchema>;
export type UpdateQuotationLineInput = z.infer<typeof UpdateQuotationLineSchema>;
export type QuotationQueryInput = z.infer<typeof QuotationQuerySchema>;
export type CreateQuotationStaffCommentInput = z.infer<typeof CreateQuotationStaffCommentSchema>;

