"use client";

import { useQueryStates } from "nuqs";
import { contactSearchParams } from "@/features/marketing/searchParams";
import { AdminListPagination } from "@/shared/admin/components/AdminListPagination";

export function ContactsPagination(props: { totalCount: number; totalPages: number; page: number; limit: number }) {
  const [, setFilters] = useQueryStates(contactSearchParams, { shallow: false, clearOnDefault: true });
  return (
    <AdminListPagination
      {...props}
      entityLabel="contacts"
      onPageChange={(page) => setFilters({ page })}
      onLimitChange={(limit) => setFilters({ limit, page: 1 })}
    />
  );
}
