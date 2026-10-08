import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { bookingStatusLabel } from "@/features/bookings/deal-status";
import type { AdminUserProfile, UserBookingRow } from "@/features/users/user.types";
import type { BookingStatus } from "@/database/types";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { cn, formatDate } from "@/shared/lib/utils/general-utils";
import { GlassPanel } from "@/shared/admin/components/glass";

const STATUS_TONE: Record<BookingStatus, string> = {
  INQUIRY: "text-muted-foreground",
  PROPOSED: "text-primary-strong",
  BOOKED: "text-success",
  COMPLETED: "text-muted-foreground",
  CANCELLED: "text-destructive",
};

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <GlassPanel
      title={title}
      aside={<span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>}
      className="gap-1 overflow-hidden px-0 pb-1 pt-4 [&>div:first-child]:px-5"
    >
      {children}
    </GlassPanel>
  );
}

function BookingList({ rows, empty, showCustomer = false }: { rows: UserBookingRow[]; empty: string; showCustomer?: boolean }) {
  if (rows.length === 0) return <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul>
      {rows.map((b) => (
        <li key={b.id} className="border-b border-border last:border-b-0">
          <Link href={`/admin/bookings/${b.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {showCustomer ? b.customerName : (b.boatName ?? "No boat yet")}
                {showCustomer && b.boatName ? <span className="text-muted-foreground"> · {b.boatName}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {b.startDateTime ? formatDate(b.startDateTime) : "No date yet"}
                {b.totalAmountCents != null
                  ? ` · ${formatCentsAsCurrency(b.totalAmountCents, { currency: b.currency ?? "USD" })}`
                  : ""}
              </p>
            </div>
            <span className={cn("shrink-0 text-xs font-medium", STATUS_TONE[b.status])}>{bookingStatusLabel(b.status)}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** What the person is connected to: their trips, deals assigned to them, boats they own. */
export function UserRecords({ user }: { user: AdminUserProfile }) {
  const isStaff = user.roles.includes("admin") || user.roles.includes("broker");
  const isOwner = user.roles.includes("owner") || user.boats.length > 0;

  return (
    <div className="space-y-4">
      {isStaff ? (
        <Section title="Deals assigned to them" count={user.assignedDeals.length}>
          <BookingList rows={user.assignedDeals} empty="No deals assigned to them yet." showCustomer />
        </Section>
      ) : null}
      {isOwner ? (
        <Section title="Boats they own" count={user.boats.length}>
          {user.boats.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No boats yet. Choose them as the owner in a boat&apos;s editor.
            </p>
          ) : (
            <ul>
              {user.boats.map((boat) => (
                <li key={boat.id} className="border-b border-border last:border-b-0">
                  <Link href={`/admin/boats/${boat.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{boat.name}</span>
                    <span className={cn("text-xs font-medium", boat.active ? "text-success" : "text-muted-foreground")}>
                      {boat.active ? "Listed" : "Hidden"}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}
      <Section title="Their trips" count={user.trips.length}>
        <BookingList rows={user.trips} empty="No trips booked on this account." />
      </Section>
    </div>
  );
}
