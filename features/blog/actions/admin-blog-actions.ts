"use server";

import { db } from "@/database/db";
import { blogPosts } from "@/database/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { BlogCategory, BlogStatus } from "@/features/blog/blog.types";
import { getAdminSession } from "@/shared/lib/utils/auth-utils";


// Types
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: BlogStatus;
  category: BlogCategory;
  isFeatured: boolean;
  featuredImage?: string | null;
  imageAlt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  author: string;
  publishedAt?: Date | null;
  scheduledFor?: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBlogPostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: BlogStatus;
  category: BlogCategory;
  author: string;
  isFeatured?: boolean;
  featuredImage?: string;
  imageAlt?: string;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: Date;
  scheduledFor?: Date;
}

export interface UpdateBlogPostData extends Partial<CreateBlogPostData> {
  id: string;
}



/** Admin only. Throws, so each action's try/catch reports it like any other failure. */
async function assertAdmin() {
  const admin = await getAdminSession();
  if (admin.error !== undefined) throw new Error(admin.error);
}

// Get published blog posts for public display
export async function getPublishedBlogPosts(options: {
  limit?: number;
  featured?: boolean;
  category?: BlogCategory;
} = {}) {
  try {
    const { limit = 10, featured, category } = options;

    const conditions = [eq(blogPosts.status, 'PUBLISHED')];
    
    if (featured !== undefined) {
      conditions.push(eq(blogPosts.isFeatured, featured));
    }
    
    if (category) {
      conditions.push(eq(blogPosts.category, category));
    }

    const posts = await db
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
      .where(and(...conditions))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);

    return posts;
  } catch (error) {
    console.error('Error fetching published blog posts:', error);
    throw new Error('Failed to fetch published blog posts');
  }
}

// Get blog post by slug for public display
export async function getBlogPostBySlug(slug: string) {
  try {
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
      .where(and(
        eq(blogPosts.slug, slug),
        eq(blogPosts.status, 'PUBLISHED')
      ));

    return post || null;
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    throw new Error('Failed to fetch blog post');
  }
}

// Create new blog post
export async function createBlogPost(data: CreateBlogPostData) {
  try {
    await assertAdmin();

    // Slug is required and provided by user
    const slug = data.slug;

    const now = new Date();
    const publishedAt = data.status === 'PUBLISHED' ? (data.publishedAt || now) : null;

    // Empty optional fields stay unset so the column defaults apply.
    const insertData: typeof blogPosts.$inferInsert = {
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content,
      status: data.status,
      category: data.category,
      isFeatured: data.isFeatured || false,
      author: data.author,
      publishedAt,
      createdAt: now,
      updatedAt: now,
      featuredImage: data.featuredImage || undefined,
      imageAlt: data.imageAlt || undefined,
      metaTitle: data.metaTitle || undefined,
      metaDescription: data.metaDescription || undefined,
      scheduledFor: data.scheduledFor || undefined,
    };

    const [newPost] = await db
      .insert(blogPosts)
      .values(insertData)
      .returning();

    revalidatePath('/admin/blog');
    revalidatePath('/news');

    return { success: true, post: newPost };
  } catch (error) {
    console.error('Error creating blog post:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create blog post' 
    };
  }
}

// Update blog post
export async function updateBlogPost(data: UpdateBlogPostData) {
  try {
    await assertAdmin();

    const { id, ...updateData } = data;
    
    // Slug is manually managed by user

    const now = new Date();
    
    // Handle publishing logic
    if (updateData.status === 'PUBLISHED') {
      const { blogService } = await import('../blog.service');
      const currentPost = await blogService.getPostById(id);
      if (currentPost && !currentPost.publishedAt) {
        updateData.publishedAt = updateData.publishedAt || now;
      }
    }

    const [updatedPost] = await db
      .update(blogPosts)
      .set({
        ...updateData,
        updatedAt: now,
      })
      .where(eq(blogPosts.id, id))
      .returning();

    revalidatePath('/admin/blog');
    revalidatePath('/news');

    return { success: true, post: updatedPost };
  } catch (error) {
    console.error('Error updating blog post:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update blog post' 
    };
  }
}

// Delete blog post
export async function deleteBlogPost(id: string) {
  try {
    await assertAdmin();

    await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id));

    revalidatePath('/admin/blog');
    revalidatePath('/news');

    return { success: true };
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete blog post' 
    };
  }
}

// Increment view count
export async function incrementViewCount(id: string) {
  try {
    await db
      .update(blogPosts)
      .set({
        viewCount: sql`${blogPosts.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id));

    return { success: true };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return { success: false };
  }
} 