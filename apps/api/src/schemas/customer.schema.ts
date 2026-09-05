import { z } from "zod";

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().default("Net 30"),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  tierId: z.string().min(1, "Customer tier ID is required"),
  salesRepId: z.string().optional(),
  portalUserId: z.string().optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export const AssignRepSchema = z.object({
  salesRepId: z.string().min(1, "Sales representative ID is required"),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type AssignRepInput = z.infer<typeof AssignRepSchema>;
