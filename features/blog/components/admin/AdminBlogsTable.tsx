"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createColumnHelper } from "@tanstack/react-table";
import { FileText, Star } from "lucide-react";
import type { BlogListItem } from "@/features/blog/blog.types";
import { BLOG_CATEGORY_LABELS } from "@/features/blog/blog.constants";
import { formatDate } from "@/shared/lib/utils/general-utils";
import { AdminDataTable } from "@/shared/admin/components/AdminDataTable";
import { BlogStatusChip } from "./BlogStatusChip";

const columnHelper = createColumnHelper<BlogListItem>();

/** The posts list. A row opens the post, where every change is made. */
export function AdminBlogsTable({ posts }: { posts: BlogListItem[] }) {
  const router = useRouter();

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        id: "post",
        header: "Post",
        cell: ({ row }) => {
          const post = row.original;
          return (
            <div className="flex max-w-[26rem] items-center gap-3">
              <div className="h-9 w-14 shrink-0 overflow-hidden rounded-lg bg-glass-inset ring-1 ring-glass-border">
                {post.featuredImage ? (
                  <Image
                    src={post.featuredImage}
                    alt={post.imageAlt || post.title}
                    width={56}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="min-w-0 truncate text-sm font-medium text-foreground">{post.title}</span>
              {post.isFeatured && (
                <Star className="h-3.5 w-3.5 shrink-0 fill-current text-warning" aria-label="Featured" />
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <BlogStatusChip status={info.getValue()} />,
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">{BLOG_CATEGORY_LABELS[info.getValue()]}</span>
        ),
      }),
      columnHelper.accessor("author", {
        header: "Author",
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("publishedAt", {
        header: "Date",
        cell: ({ row }) => {
          const post = row.original;
          const date = post.status === "PUBLISHED" && post.publishedAt ? post.publishedAt : post.createdAt;
          return <span className="whitespace-nowrap text-sm text-muted-foreground">{date ? formatDate(date) : "—"}</span>;
        },
      }),
      columnHelper.accessor("viewCount", {
        header: "Views",
        cell: (info) => <span className="text-sm tabular-nums text-muted-foreground">{info.getValue() ?? 0}</span>,
      }),
    ],
    []
  );

  return (
    <AdminDataTable
      data={posts}
      columns={columns}
      onRowClick={(post) => router.push(`/admin/blog/${post.id}/edit`)}
      emptyIcon={FileText}
      emptyTitle="No posts match"
      emptyDescription="Try a different search or view, or write a new post."
    />
  );
}
