import { db } from "@/database/db";
import { blogPosts } from "@/database/schema";
import { eq, desc, and, or, like, count } from "drizzle-orm";
import { resolveAdminListPagination } from "@/shared/admin/list-pagination";
import type {
  BlogDetails,
  BlogListItem,
  BlogStatus,
  BlogCategory,
  PaginatedBlogResponse,
} from "./blog.types";

export interface BlogFilterInput {
  page?: number;
  limit?: number;
  status?: BlogStatus;
  category?: BlogCategory;
  search?: string;
  featured?: boolean;
}

/**
 * Blog Service Layer
 * Single source of truth for blog data fetching
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
};
