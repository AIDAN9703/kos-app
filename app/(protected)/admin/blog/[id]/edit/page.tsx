import { notFound } from "next/navigation";
import BlogForm from "@/features/blog/components/BlogForm";
import { BlogPostActions } from "@/features/blog/components/admin/BlogPostActions";
import { BlogStatusChip } from "@/features/blog/components/admin/BlogStatusChip";
import { getPost } from "@/features/blog/blog.data";
import { BLOG_CATEGORY_LABELS } from "@/features/blog/blog.constants";
import { GlassHeader, GlassPage, GlassPanel } from "@/shared/admin/components/glass";

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <GlassPage>
      <GlassHeader
        title={post.title}
        meta={
          <>
            <BlogStatusChip status={post.status} />
            <span>
              {BLOG_CATEGORY_LABELS[post.category]} · {post.viewCount ?? 0} views
            </span>
          </>
        }
        actions={
          <BlogPostActions id={post.id} title={post.title} slug={post.slug} published={post.status === "PUBLISHED"} />
        }
      />
      <GlassPanel className="p-6">
        <BlogForm mode="edit" initialData={post} />
      </GlassPanel>
    </GlassPage>
  );
}
