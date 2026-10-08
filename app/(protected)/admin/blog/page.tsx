import { listPosts } from "@/features/blog/blog.data";
import { blogSearchParamsCache } from "@/features/blog/searchParams";
import { AdminBlogFilter } from "@/features/blog/components/admin/AdminBlogFilter";
import { AdminBlogTablePagination } from "@/features/blog/components/admin/AdminBlogTablePagination";
import { AdminBlogsTable } from "@/features/blog/components/admin/AdminBlogsTable";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";
import { Button } from "@/shared/components/ui/button";

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await blogSearchParamsCache.parse(searchParams);

  const result = await listPosts({
    search: params.search || undefined,
    status: params.status ?? undefined,
    featured: params.featured ?? undefined,
    page: params.page,
    limit: params.limit,
  });

  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader
              title="Blog posts"
              actions={
                <Button asChild className="h-9 gap-1.5 rounded-full px-4 font-semibold">
                  <Link href="/admin/blog/create">
                    <Plus className="size-3.5" />
                    New post
                  </Link>
                </Button>
              }
            />
            <AdminBlogFilter />
          </>
        }
        pagination={
          <AdminBlogTablePagination
            totalCount={result.totalCount}
            totalPages={result.totalPages}
            page={result.page}
            limit={result.limit}
          />
        }
      >
        <AdminBlogsTable posts={result.posts} />
      </AdminListShell>
    </GlassPage>
  );
}
