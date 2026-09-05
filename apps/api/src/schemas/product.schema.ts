import { z } from "zod";
import { UnitType } from "@repo/db";

export const CreateProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required").transform((val) => val.toUpperCase().trim()),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category ID is required"),
  basePrice: z.number().min(0, "Base price must be positive"),
  costPrice: z.number().min(0, "Cost price must be positive"),
  unit: z.nativeEnum(UnitType).default(UnitType.UNIT),
  taxRate: z.number().min(0).max(100).default(0.0),
  isPromoted: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const CreateProductVariantSchema = z.object({
  attributeName: z.string().min(1, "Attribute name is required (e.g. Ports, RAM)"),
  attributeValue: z.string().min(1, "Attribute value is required (e.g. 24-Port, 64GB)"),
  sku: z.string().optional(),
  extraPrice: z.number().default(0.0),
  costPriceDelta: z.number().default(0.0),
  isActive: z.boolean().default(true),
});

export const UpdateProductVariantSchema = CreateProductVariantSchema.partial();

export const EffectivePriceQuerySchema = z.object({
  customerId: z.string().optional(),
  variantId: z.string().optional(),
  quantity: z.coerce.number().min(1).default(1),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type CreateProductVariantInput = z.infer<typeof CreateProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof UpdateProductVariantSchema>;
export type EffectivePriceQuery = z.infer<typeof EffectivePriceQuerySchema>;
