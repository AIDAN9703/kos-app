import "server-only";

import { db } from "@/database/db";
import { blogPosts } from "@/database/schema";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";
import { resolveAdminListPagination } from "@/shared/admin/list-pagination";
import type {
  BlogDetails,
  BlogListItem,
  BlogStatus,
  BlogCategory,
  PaginatedBlogResponse,
} from "./blog.types";
import type { BlogPostValues } from "./blog.validation";

export interface BlogFilterInput {
  page?: number;
  limit?: number;
  status?: BlogStatus;
  category?: BlogCategory;
  search?: string;
  featured?: boolean;
}

/**
 * News post queries. Server-only and not access-checked: pages and actions go
 * through blog.data.ts (published posts for everyone, the rest for admins).
 */
export const blogService = {
  /**
   * Get paginated and filtered blog posts
   */
  async getAllPosts(filters?: BlogFilterInput): Promise<PaginatedBlogResponse> {
    const { page, limit, offset } = resolveAdminListPagination(filters);

    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(blogPosts.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(blogPosts.category, filters.category));
    }
    if (filters?.featured !== undefined) {
      conditions.push(eq(blogPosts.isFeatured, filters.featured));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(blogPosts.title, `%${filters.search}%`),
          like(blogPosts.excerpt, `%${filters.search}%`),
          like(blogPosts.content, `%${filters.search}%`)
        )!
      );
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [posts, totalResult] = await Promise.all([
      db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          status: blogPosts.status,
          category: blogPosts.category,
          isFeatured: blogPosts.isFeatured,
          featuredImage: blogPosts.featuredImage,
          imageAlt: blogPosts.imageAlt,
          author: blogPosts.author,
          publishedAt: blogPosts.publishedAt,
          scheduledFor: blogPosts.scheduledFor,
          viewCount: blogPosts.viewCount,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .where(whereClause)
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(blogPosts)
        .where(whereClause),
    ]);

    const totalCount = totalResult[0]?.count ?? 0;

    return {
      posts: posts as BlogListItem[],
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },

  /**
   * Get single blog post by ID
   */
  async getPostById(id: string): Promise<BlogDetails | null> {
    const [post] = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        status: blogPosts.status,
        category: blogPosts.category,
        isFeatured: blogPosts.isFeatured,
        featuredImage: blogPosts.featuredImage,
        imageAlt: blogPosts.imageAlt,
        metaTitle: blogPosts.metaTitle,
        metaDescription: blogPosts.metaDescription,
        author: blogPosts.author,
        publishedAt: blogPosts.publishedAt,
        scheduledFor: blogPosts.scheduledFor,
        viewCount: blogPosts.viewCount,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .where(eq(blogPosts.id, id));

    if (!post) return null;
    return {
      ...post,
      status: post.status as BlogStatus,
      category: post.category as BlogCategory,
    } as BlogDetails;
  },

  // ==========================================================================
  // PUBLISHED (the public news pages)
  // ==========================================================================

  /** Published posts, newest first. */
  async getPublishedPosts(options: { limit?: number; featured?: boolean; category?: BlogCategory } = {}) {
    const { limit = 10, featured, category } = options;
    return db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        status: blogPosts.status,
        category: blogPosts.category,
        isFeatured: blogPosts.isFeatured,
        featuredImage: blogPosts.featuredImage,
        imageAlt: blogPosts.imageAlt,
        publishedAt: blogPosts.publishedAt,
        viewCount: blogPosts.viewCount,
        author: blogPosts.author,
        createdAt: blogPosts.createdAt,
      })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, "PUBLISHED"),
          featured !== undefined ? eq(blogPosts.isFeatured, featured) : undefined,
          category ? eq(blogPosts.category, category) : undefined
        )
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  },

  /** A published post by its slug, or null. */
  async getPublishedPostBySlug(slug: string) {
    const [post] = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        status: blogPosts.status,
        category: blogPosts.category,
        isFeatured: blogPosts.isFeatured,
        featuredImage: blogPosts.featuredImage,
        imageAlt: blogPosts.imageAlt,
        metaTitle: blogPosts.metaTitle,
        metaDescription: blogPosts.metaDescription,
        publishedAt: blogPosts.publishedAt,
        viewCount: blogPosts.viewCount,
        author: blogPosts.author,
        createdAt: blogPosts.createdAt,
      })
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "PUBLISHED")));
    return post ?? null;
  },

  /** Count a read of a published post (leaves updatedAt alone). */
  async recordView(id: string): Promise<void> {
    await db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(and(eq(blogPosts.id, id), eq(blogPosts.status, "PUBLISHED")));
  },

  // ==========================================================================
  // WRITES
  // ==========================================================================

  /** Empty optional fields stay unset, so the column defaults apply. */
  async createPost(values: BlogPostValues): Promise<{ id: string }> {
    const now = new Date();
    const [post] = await db
      .insert(blogPosts)
      .values({
        ...values,
        featuredImage: values.featuredImage || undefined,
        imageAlt: values.imageAlt || undefined,
        metaTitle: values.metaTitle || undefined,
        metaDescription: values.metaDescription || undefined,
        publishedAt: values.status === "PUBLISHED" ? (values.publishedAt ?? now) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: blogPosts.id });
    return post;
  },

  async updatePost(id: string, values: Partial<BlogPostValues>): Promise<void> {
    await db
      .update(blogPosts)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(blogPosts.id, id));
  },

  async deletePost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  },
};
