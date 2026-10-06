import Link from "next/link";
import { cn } from "@/shared/lib/utils/general-utils";
import { requireOwner } from "@/shared/lib/utils/auth-utils";
import { CharterList } from "@/features/owner-dashboard/components/CharterList";
import { splitCharters } from "@/features/owner-dashboard/owner-analytics";
import { getMyCharters } from "@/features/owner-dashboard/owner.data";

const VIEWS = [
  { key: "upcoming", label: "Upcoming", empty: "Nothing booked on your boats right now." },
  { key: "past", label: "Past", empty: "No completed charters yet." },
  { key: "cancelled", label: "Cancelled", empty: "No cancelled charters." },
] as const;

type View = (typeof VIEWS)[number]["key"];

export default async function OwnerChartersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [, params] = await Promise.all([requireOwner(), searchParams]);
  const groups = splitCharters(await getMyCharters());
  const view: View = VIEWS.some((v) => v.key === params.view) ? (params.view as View) : "upcoming";
  const current = VIEWS.find((v) => v.key === view)!;

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Charters</h1>

      <nav aria-label="Filter charters" className="inline-flex rounded-full bg-slate-100 p-1">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "upcoming" ? "/owner/charters" : `/owner/charters?view=${v.key}`}
            aria-current={v.key === view ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              v.key === view
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-primary"
            )}
          >
            {v.label} <span className="font-normal text-slate-400">{groups[v.key].length}</span>
          </Link>
        ))}
      </nav>

      <CharterList charters={groups[view]} empty={current.empty} />
    </div>
  );
}
