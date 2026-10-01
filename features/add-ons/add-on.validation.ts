import * as z from "zod";
import { addOnCategoryEnum } from "@/database/schema";

/** Catalog add-on base fields. Prices are stored in USD cents. */
export const addOnBaseSchema = z.object({
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

export const addOnFilterSchema = z.object({
  search: z.string().optional(),
  category: z.enum(addOnCategoryEnum.enumValues).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().max(200).optional(),
});

export type CreateAddOnInput = z.infer<typeof createAddOnSchema>;
export type UpdateAddOnInput = z.infer<typeof updateAddOnSchema>;
export type AddOnFilterInput = z.infer<typeof addOnFilterSchema>;
