import { notFound } from "next/navigation";
import BlogForm from "@/features/blog/components/BlogForm";
import { getPost } from "@/features/blog/blog.data";

interface EditBlogPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  // Await params for Next.js 15 compatibility
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6 p-4 md:px-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <BlogForm mode="edit" initialData={post} />
      </div>
    </div>
  );
}
