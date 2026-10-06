import * as z from "zod";

/** A news post as the admin form saves it (the server re-checks every field). */
export const blogPostInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  excerpt: z.string().trim().min(1, "Excerpt is required").max(500),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "SCHEDULED"]),
  category: z.enum([
    "FLEET_NEWS",
    "CONSERVATION",
    "TIPS_ADVICE",
    "CASE_STUDY",
    "COMPANY_NEWS",
    "SAFETY",
    "EVENTS",
  ]),
  author: z.string().trim().min(1, "Author is required").max(100),
  isFeatured: z.boolean().default(false),
  featuredImage: z.string().optional(),
  imageAlt: z.string().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  publishedAt: z.coerce.date().optional(),
  scheduledFor: z.coerce.date().optional(),
});

export type BlogPostInput = z.input<typeof blogPostInputSchema>;
export type BlogPostValues = z.output<typeof blogPostInputSchema>;
