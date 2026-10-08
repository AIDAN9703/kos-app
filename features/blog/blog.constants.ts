import type { BlogCategory } from "@/features/blog/blog.types";

/** Category names everywhere a post's category shows: admin, the form, the news pages. */
export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  FLEET_NEWS: "Fleet News",
  CONSERVATION: "Conservation",
  TIPS_ADVICE: "Tips & Advice",
  CASE_STUDY: "Case Study",
  COMPANY_NEWS: "Company News",
  SAFETY: "Safety",
  EVENTS: "Events",
};
