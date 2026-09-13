import { z } from "zod";

export const projectInput = z.object({
  name: z.string().trim().min(1).max(120),
});
export const flowInput = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(4000).optional(),
  source: z.enum(["manual", "ai-discovered"]).optional(),
  steps: z
    .array(
      z.object({
        order: z.number().int().min(0).optional(),
        description: z.string().trim().min(1).max(4000),
        expectedOutcome: z.string().max(4000).optional(),
      }),
    )
    .min(1)
    .max(200),
});
