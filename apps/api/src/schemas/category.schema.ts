import { z } from "zod";
import { CategoryType } from "@repo/db";

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().optional(),
  type: z.nativeEnum(CategoryType).default(CategoryType.HARDWARE),
  discountCeiling: z.number().min(0).max(100, "Discount ceiling must be between 0 and 100"),
  targetMargin: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
