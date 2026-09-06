import { z } from "zod";

export const QueryStalledDealsSchema = z.object({
  thresholdDays: z.coerce.number().int().positive().optional().default(7),
  asOfDate: z.coerce.date().optional(),
});

export const QueryAnomaliesSchema = z.object({
  multiplier: z.coerce.number().positive().optional().default(1.5),
  asOfDate: z.coerce.date().optional(),
});

export const QuerySlippageSchema = z.object({
  asOfDate: z.coerce.date().optional(),
  slaDays: z.coerce.number().int().positive().optional().default(7),
});

export type QueryStalledDealsInput = z.infer<typeof QueryStalledDealsSchema>;
export type QueryAnomaliesInput = z.infer<typeof QueryAnomaliesSchema>;
export type QuerySlippageInput = z.infer<typeof QuerySlippageSchema>;

export const NudgeActionSchema = z.object({
  type: z.enum(["nudge", "escalate"]),
  note: z.string().max(500).optional(),
});
export type NudgeActionInput = z.infer<typeof NudgeActionSchema>;
