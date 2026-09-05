import { z } from "zod";
import { ShipmentStatus, FulfillmentStatus } from "@repo/db";

export const CreateFulfillmentOrderSchema = z.object({
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateShipmentStatusSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
});

export const ConsolidateBackorderSchema = z.object({
  warehouseId: z.string().optional(),
});

export const FulfillmentOrderQuerySchema = z.object({
  status: z.nativeEnum(FulfillmentStatus).optional(),
  quotationId: z.string().optional(),
});

export type CreateFulfillmentOrderInput = z.infer<typeof CreateFulfillmentOrderSchema>;
export type UpdateShipmentStatusInput = z.infer<typeof UpdateShipmentStatusSchema>;
export type ConsolidateBackorderInput = z.infer<typeof ConsolidateBackorderSchema>;
export type FulfillmentOrderQueryInput = z.infer<typeof FulfillmentOrderQuerySchema>;
