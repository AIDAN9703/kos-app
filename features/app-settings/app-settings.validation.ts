import { z } from "zod";

export const updateAppSettingsSchema = z.object({
  serviceFeeBps: z
    .number()
    .int("Service fee must be a whole number of basis points")
    .min(0, "Service fee cannot be negative")
    .max(2_000, "Service fee cannot exceed 20%"),
  serviceFeeFixedCents: z
    .number()
    .int("The fixed fee must be whole cents")
    .min(0, "The fixed fee cannot be negative")
    .max(2_000, "The fixed fee cannot exceed $20"),
});

export type UpdateAppSettingsInput = z.infer<typeof updateAppSettingsSchema>;
