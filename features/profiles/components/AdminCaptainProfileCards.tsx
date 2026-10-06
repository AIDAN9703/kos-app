import Link from "next/link";
import { Anchor, Mail, Phone } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarImage } from "@/shared/components/ui/avatar";
import { StatusBadge } from "@/shared/lib/utils/badge-utils";
import { DefaultUserAvatarFallback } from "@/shared/lib/utils/user-utils";
import {
  cn,
  formatDate,
  formatPhoneNumberForDisplay,
  formatPhoneNumberTelHref,
} from "@/shared/lib/utils/general-utils";
import type { CaptainProfileAdminRow } from "@/features/profiles/crew.types";

function displayName(r: CaptainProfileAdminRow) {
  return [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || r.email;
}

/** Hide auto-generated emails from the bulk seed so cards stay clean. */
function isPlaceholderEmail(email: string) {
  return email.endsWith("@kos.placeholder");
}

export function AdminCaptainProfileCards({ rows }: { rows: CaptainProfileAdminRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <Anchor className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-medium text-foreground">No captains</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Promote a user to captain, or run the bulk seed script to import your captain pool.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((r) => {
        const name = displayName(r);
        const showEmail = !isPlaceholderEmail(r.email);
        const profileActive = r.profileStatus === "ACTIVE";

        return (
          <div
            key={r.userId}
            className={cn(
              "flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-colors",
              profileActive
                ? "border-border/60 hover:border-border"
                : "border-border/40 bg-muted/30"
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/60">
                <AvatarImage src={r.profileImage || undefined} alt={name} />
                <DefaultUserAvatarFallback size="md" />
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/users/${r.userId}`}
                  className="block truncate text-base font-semibold leading-tight text-foreground hover:underline"
                >
                  {name}
                </Link>
                {r.licenseType ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {r.licenseType}
                    {!r.uscgLicensed ? " · non-USCG" : ""}
                  </p>
                ) : r.uscgLicensed ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">USCG licensed</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              {showEmail ? (
                <a
                  href={`mailto:${r.email}`}
                  className="flex items-center gap-2 text-foreground hover:text-primary-strong hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{r.email}</span>
                </a>
              ) : null}
              {r.phoneNumber ? (
                <a
                  href={`tel:${formatPhoneNumberTelHref(r.phoneNumber)}`}
                  className="flex items-center gap-2 text-foreground hover:text-primary-strong hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{formatPhoneNumberForDisplay(r.phoneNumber)}</span>
                </a>
              ) : null}
              {!showEmail && !r.phoneNumber ? (
                <p className="text-xs text-muted-foreground">No contact info yet</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.profileStatus} />
              {r.userStatus !== "ACTIVE" ? <StatusBadge status={r.userStatus} /> : null}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>Updated {formatDate(r.profileUpdatedAt)}</span>
              <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                <Link href={`/admin/users/${r.userId}`}>View</Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
