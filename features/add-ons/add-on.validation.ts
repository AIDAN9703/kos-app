import * as z from "zod";
import { addOnCategoryEnum } from "@/database/schema";

/** Catalog add-on base fields. Prices are stored in USD cents. */
const addOnBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  category: z.enum(addOnCategoryEnum.enumValues).default("OTHER"),
  defaultPriceCents: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  imageUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
});

export const createAddOnSchema = addOnBaseSchema;
export const updateAddOnSchema = addOnBaseSchema.partial();

/** Catalog list filters. */
export interface AddOnFilterInput {
  search?: string;
  category?: (typeof addOnCategoryEnum.enumValues)[number];
  active?: boolean;
  page?: number;
  limit?: number;
}

export type CreateAddOnInput = z.infer<typeof createAddOnSchema>;
export type UpdateAddOnInput = z.infer<typeof updateAddOnSchema>;
