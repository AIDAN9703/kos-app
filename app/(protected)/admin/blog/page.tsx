import { listPosts } from "@/features/blog/blog.data";
import { blogSearchParamsCache } from "@/features/blog/searchParams";
import { AdminBlogFilter } from "@/features/blog/components/admin/AdminBlogFilter";
import { AdminBlogTablePagination } from "@/features/blog/components/admin/AdminBlogTablePagination";
import { AdminBlogsTable } from "@/features/blog/components/admin/AdminBlogsTable";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { SearchParams } from "next/dist/server/request/search-params";

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await blogSearchParamsCache.parse(searchParams);
  const params = blogSearchParamsCache.all();

  const result = await listPosts({
    search: params.search || undefined,
    status: params.status ?? undefined,
    category: params.category ?? undefined,
    featured: params.featured ?? undefined,
    page: params.page,
    limit: params.limit,
  });

  return (
    <AdminListShell
      toolbar={<AdminBlogFilter />}
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
  );
}
