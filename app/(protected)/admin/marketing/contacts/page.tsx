import type { SearchParams } from "nuqs/server";
import { getContactSummary, listMarketingContacts } from "@/features/marketing/marketing.data";
import { contactSearchParamsCache } from "@/features/marketing/searchParams";
import { MarketingTabs } from "@/features/marketing/components/MarketingTabs";
import { MarketingNumbers } from "@/features/marketing/components/MarketingNumbers";
import { ContactsToolbar } from "@/features/marketing/components/ContactsToolbar";
import { ContactsTable } from "@/features/marketing/components/ContactsTable";
import { ContactsPagination } from "@/features/marketing/components/ContactsPagination";
import { ImportContactsSheet } from "@/features/marketing/components/ImportContactsSheet";
import { SyncContactsButton } from "@/features/marketing/components/SyncContactsButton";
import { AdminListShell } from "@/shared/admin/components/AdminListShell";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";

export default async function MarketingContactsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { search, list, filter, page, limit } = await contactSearchParamsCache.parse(searchParams);
  const [summary, result] = await Promise.all([
    getContactSummary(),
    listMarketingContacts({ search: search || undefined, source: list ?? undefined, filter: filter ?? undefined, page, limit }),
  ]);
  return (
    <GlassPage fill compact>
      <AdminListShell
        toolbar={
          <>
            <GlassHeader
              title="Marketing"
              actions={
                <>
                  <ImportContactsSheet />
                  <SyncContactsButton pending={summary.pending} />
                </>
              }
            />
            <div className="flex flex-col gap-4 pb-4">
              <MarketingTabs />
              <MarketingNumbers summary={summary} />
            </div>
            <ContactsToolbar lists={summary.sources.map((s) => s.source)} />
          </>
        }
        pagination={
          <ContactsPagination
            totalCount={result.totalCount}
            totalPages={Math.max(1, Math.ceil(result.totalCount / limit))}
            page={page}
            limit={limit}
          />
        }
      >
        <ContactsTable contacts={result.contacts} />
      </AdminListShell>
    </GlassPage>
  );
}
