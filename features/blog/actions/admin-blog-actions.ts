"use server";

import { revalidatePath } from "next/cache";

import * as blog from "@/features/blog/blog.data";
import type { BlogPostInput } from "@/features/blog/blog.validation";
import type { ActionResponse } from "@/shared/lib/types/types";
import { actionError } from "@/shared/lib/utils/action-helpers";

/** News post actions (admins). Thin wrappers over blog.data.ts. */

function revalidateNews() {
  revalidatePath("/admin/blog");
  revalidatePath("/news");
}

export async function createBlogPost(input: BlogPostInput): Promise<ActionResponse<{ id: string }>> {
  try {
    const created = await blog.createPost(input);
    revalidateNews();
    return { success: true, data: created };
  } catch (error) {
    return actionError(error, "Failed to create blog post");
  }
}

export async function updateBlogPost({ id, ...input }: BlogPostInput & { id: string }): Promise<ActionResponse<null>> {
  try {
    await blog.updatePost(id, input);
    revalidateNews();
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Failed to update blog post");
  }
}

export async function deleteBlogPost(id: string): Promise<ActionResponse<null>> {
  try {
    await blog.deletePost(id);
    revalidateNews();
    return { success: true, data: null };
  } catch (error) {
    return actionError(error, "Failed to delete blog post");
  }
}
