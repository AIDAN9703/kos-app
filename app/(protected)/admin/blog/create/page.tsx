import BlogForm from "@/features/blog/components/BlogForm";
import { GlassHeader, GlassPage, GlassPanel } from "@/shared/admin/components/glass";

export default function CreateBlogPage() {
  return (
    <GlassPage>
      <GlassHeader back="/admin/blog" title="New post" />
      <GlassPanel className="p-6">
        <BlogForm mode="create" />
      </GlassPanel>
    </GlassPage>
  );
}
