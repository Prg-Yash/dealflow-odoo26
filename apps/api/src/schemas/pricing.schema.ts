import { z } from "zod";

export const CreatePriceListSchema = z.object({
  name: z.string().min(1, "Price list name is required"),
  currency: z.string().default("INR"),
  customerTierId: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
});

export const UpdatePriceListSchema = z.object({
  name: z.string().min(1, "Price list name cannot be empty").optional(),
  currency: z.string().optional(),
  customerTierId: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const CreatePriceListItemBaseSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional(),
  fixedPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  minQuantity: z.number().int().min(1).default(1),
});

export const CreatePriceListItemSchema = CreatePriceListItemBaseSchema.refine(
  (data) => data.fixedPrice !== undefined || data.discountPercent !== undefined,
  { message: "Either fixedPrice or discountPercent must be specified" }
);

export const UpdatePriceListItemSchema = z.object({
  fixedPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  minQuantity: z.number().int().min(1).optional(),
});

export const CreateDiscountApprovalRuleSchema = z
  .object({
    name: z.string().min(1, "Rule name is required"),
    minDiscountPercent: z.number().min(0).optional(),
    maxDiscountPercent: z.number().min(0).max(100).optional(),
    minDiscount: z.number().min(0).optional(),
    maxDiscount: z.number().min(0).max(100).optional(),
    minBlendedRiskScore: z.number().min(0).optional(),
    maxBlendedRiskScore: z.number().min(0).max(100).optional(),
    minRiskScore: z.number().min(0).optional(),
    maxRiskScore: z.number().min(0).max(100).optional(),
    requiresManagerApproval: z.boolean().optional(),
    requiresFinanceApproval: z.boolean().optional(),
    escalationLevel: z.string().default("SALES_MANAGER").optional(),
    description: z.string().nullable().optional(),
  })
  .transform((data) => {
    const maxDiscountPercent = data.maxDiscountPercent ?? data.maxDiscount ?? 15.0;
    const minDiscountPercent = data.minDiscountPercent ?? data.minDiscount ?? 0.0;
    const maxBlendedRiskScore = data.maxBlendedRiskScore ?? data.maxRiskScore ?? 10.0;
    const minBlendedRiskScore = data.minBlendedRiskScore ?? data.minRiskScore ?? 0.0;
    const escalationLevel = data.escalationLevel ?? "SALES_MANAGER";
    const requiresManagerApproval =
      data.requiresManagerApproval !== undefined
        ? data.requiresManagerApproval
        : escalationLevel !== "NONE";
    const requiresFinanceApproval =
      data.requiresFinanceApproval !== undefined
        ? data.requiresFinanceApproval
        : escalationLevel === "SALES_MANAGER_AND_FINANCE" || escalationLevel === "FINANCE";

    return {
      name: data.name,
      minDiscountPercent,
      maxDiscountPercent,
      minBlendedRiskScore,
      maxBlendedRiskScore,
      requiresManagerApproval,
      requiresFinanceApproval,
      escalationLevel,
      description: data.description ? data.description : undefined,
    };
  });

export const UpdateDiscountApprovalRuleSchema = z
  .object({
    name: z.string().min(1).optional(),
    minDiscountPercent: z.number().min(0).optional(),
    maxDiscountPercent: z.number().min(0).max(100).optional(),
    minDiscount: z.number().min(0).optional(),
    maxDiscount: z.number().min(0).max(100).optional(),
    minBlendedRiskScore: z.number().min(0).optional(),
    maxBlendedRiskScore: z.number().min(0).max(100).optional(),
    minRiskScore: z.number().min(0).optional(),
    maxRiskScore: z.number().min(0).max(100).optional(),
    requiresManagerApproval: z.boolean().optional(),
    requiresFinanceApproval: z.boolean().optional(),
    escalationLevel: z.string().optional(),
    description: z.string().nullable().optional(),
  })
  .transform((data) => {
    const maxDiscountPercent = data.maxDiscountPercent ?? data.maxDiscount;
    const minDiscountPercent = data.minDiscountPercent ?? data.minDiscount;
    const maxBlendedRiskScore = data.maxBlendedRiskScore ?? data.maxRiskScore;
    const minBlendedRiskScore = data.minBlendedRiskScore ?? data.minRiskScore;

    return {
      ...(data.name !== undefined && { name: data.name }),
      ...(minDiscountPercent !== undefined && { minDiscountPercent }),
      ...(maxDiscountPercent !== undefined && { maxDiscountPercent }),
      ...(minBlendedRiskScore !== undefined && { minBlendedRiskScore }),
      ...(maxBlendedRiskScore !== undefined && { maxBlendedRiskScore }),
      ...(data.requiresManagerApproval !== undefined && { requiresManagerApproval: data.requiresManagerApproval }),
      ...(data.requiresFinanceApproval !== undefined && { requiresFinanceApproval: data.requiresFinanceApproval }),
      ...(data.escalationLevel !== undefined && { escalationLevel: data.escalationLevel }),
      ...(data.description !== undefined && { description: data.description || undefined }),
    };
  });

export const CreateProductRecommendationBaseSchema = z.object({
  sourceProductId: z.string().min(1, "Source product ID is required"),
  recommendedProductId: z.string().min(1, "Recommended product ID is required"),
  coPurchaseScore: z.number().min(0).default(1.0),
  promotionalTag: z.string().optional(),
  minMarginThreshold: z.number().min(0).max(100).default(20.0),
  isActive: z.boolean().default(true),
});

export const CreateProductRecommendationSchema = CreateProductRecommendationBaseSchema.refine(
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
