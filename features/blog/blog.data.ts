import "server-only";

import { blogService, type BlogFilterInput } from "@/features/blog/blog.service";
import type { BlogCategory, BlogDetails, PaginatedBlogResponse } from "@/features/blog/blog.types";
import { blogPostInputSchema, type BlogPostInput } from "@/features/blog/blog.validation";
import { UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * News data layer: published posts for everyone; drafts, editing and
 * publishing for admins (blog:edit). Writes accept only the post's own
 * fields, validated on the server.
 */

// ============================================================================
// PUBLIC
// ============================================================================

export function getPublishedBlogPosts(options: { limit?: number; featured?: boolean; category?: BlogCategory } = {}) {
  return blogService.getPublishedPosts(options);
}

export function getBlogPostBySlug(slug: string) {
  return blogService.getPublishedPostBySlug(slug);
}

/** Count a read of a published post. */
export async function recordPostView(id: string): Promise<void> {
  if (isUuid(id)) await blogService.recordView(id);
}

// ============================================================================
// ADMIN (blog:edit)
// ============================================================================

export async function listPosts(filters?: BlogFilterInput): Promise<PaginatedBlogResponse> {
  await assertCan({ blog: ["edit"] });
  return blogService.getAllPosts(filters);
}

export async function getPost(id: string): Promise<BlogDetails | null> {
  await assertCan({ blog: ["edit"] });
  return isUuid(id) ? blogService.getPostById(id) : null;
}

export async function createPost(input: BlogPostInput): Promise<{ id: string }> {
  await assertCan({ blog: ["edit"] });
  return blogService.createPost(blogPostInputSchema.parse(input));
}

/** Save an edit. Publishing for the first time stamps publishedAt. */
export async function updatePost(id: string, input: BlogPostInput): Promise<void> {
  await assertCan({ blog: ["edit"] });
  const current = isUuid(id) ? await blogService.getPostById(id) : null;
  if (!current) throw new UserFacingError("Post not found", 404);
  const values = blogPostInputSchema.parse(input);
  if (values.status === "PUBLISHED" && !current.publishedAt) {
    values.publishedAt = values.publishedAt ?? new Date();
  }
  await blogService.updatePost(id, values);
}

export async function deletePost(id: string): Promise<void> {
  await assertCan({ blog: ["edit"] });
  if (!isUuid(id)) throw new UserFacingError("Post not found", 404);
  await blogService.deletePost(id);
}
