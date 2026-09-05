import { z } from "zod";

export const CreatePriceListSchema = z.object({
  name: z.string().min(1, "Price list name is required"),
  currency: z.string().default("USD"),
  customerTierId: z.string().optional(),
  isDefault: z.boolean().default(false),
})

export const UpdatePriceListSchema = CreatePriceListSchema;

export const CreatePriceListItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional(),
  fixedPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  minQuantity: z.number().int().min(1).default(1),
}).refine(
  (data) => data.fixedPrice !== undefined || data.discountPercent !== undefined,
  { message: "Either fixedPrice or discountPercent must be specified" }
);

export const UpdatePriceListItemSchema = z.object({
  fixedPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  minQuantity: z.number().int().min(1).optional(),
});

export const CreateDiscountApprovalRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  minDiscountPercent: z.number().min(0).default(0.0),
  maxDiscountPercent: z.number().min(0).max(100),
  minBlendedRiskScore: z.number().min(0).default(0.0),
  maxBlendedRiskScore: z.number().min(0).max(100).default(100.0),
  requiresManagerApproval: z.boolean().default(false),
  requiresFinanceApproval: z.boolean().default(false),
  escalationLevel: z.string().default("SALES_MANAGER"),
  description: z.string().optional(),
});

export const UpdateDiscountApprovalRuleSchema = CreateDiscountApprovalRuleSchema;

export const CreateProductRecommendationSchema = z.object({
  sourceProductId: z.string().min(1, "Source product ID is required"),
  recommendedProductId: z.string().min(1, "Recommended product ID is required"),
  coPurchaseScore: z.number().min(0).default(1.0),
  promotionalTag: z.string().optional(),
  minMarginThreshold: z.number().min(0).max(100).default(20.0),
  isActive: z.boolean().default(true),
}).refine(
  (data) => data.sourceProductId !== data.recommendedProductId,
  { message: "Source and recommended products cannot be the same" }
);

export const UpdateProductRecommendationSchema = CreateProductRecommendationSchema;

export type CreatePriceListInput = z.infer<typeof CreatePriceListSchema>;
export type UpdatePriceListInput = z.infer<typeof UpdatePriceListSchema>;
export type CreatePriceListItemInput = z.infer<typeof CreatePriceListItemSchema>;
export type UpdatePriceListItemInput = z.infer<typeof UpdatePriceListItemSchema>;
export type CreateDiscountApprovalRuleInput = z.infer<typeof CreateDiscountApprovalRuleSchema>;
export type UpdateDiscountApprovalRuleInput = z.infer<typeof UpdateDiscountApprovalRuleSchema>;
export type CreateProductRecommendationInput = z.infer<typeof CreateProductRecommendationSchema>;
export type UpdateProductRecommendationInput = z.infer<typeof UpdateProductRecommendationSchema>;
