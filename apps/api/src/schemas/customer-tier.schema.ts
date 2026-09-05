import { z } from "zod";

export const CreateCustomerTierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  code: z.string().min(1, "Tier code is required").transform((val) => val.toUpperCase().trim()),
  discountCeiling: z.number().min(0).max(100, "Discount ceiling must be between 0% and 100%"),
  description: z.string().optional(),
});

export const UpdateCustomerTierSchema = CreateCustomerTierSchema.partial();

export type CreateCustomerTierInput = z.infer<typeof CreateCustomerTierSchema>;
export type UpdateCustomerTierInput = z.infer<typeof UpdateCustomerTierSchema>;
