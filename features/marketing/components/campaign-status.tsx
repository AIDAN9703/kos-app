import type { CampaignListItem } from "@/features/marketing/marketing.types";
import { cn } from "@/shared/lib/utils/general-utils";

/** A scheduled campaign whose time has passed has gone out. */
export function effectiveStatus(c: Pick<CampaignListItem, "status" | "scheduledAt">): CampaignListItem["status"] {
  return c.status === "SCHEDULED" && c.scheduledAt && c.scheduledAt.getTime() <= Date.now() ? "SENT" : c.status;
}

/** Each status in its own color, like the role and kind chips. */
const STYLES: Record<CampaignListItem["status"], { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-400/15 text-slate-300 ring-slate-400/30" },
  SCHEDULED: { label: "Scheduled", className: "bg-sky-400/15 text-sky-300 ring-sky-400/30" },
  SENT: { label: "Sent", className: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-400/10 text-slate-400 ring-slate-400/20" },
};

export function CampaignStatusBadge({ campaign }: { campaign: Pick<CampaignListItem, "status" | "scheduledAt"> }) {
  const s = STYLES[effectiveStatus(campaign)];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", s.className)}>
      {s.label}
    </span>
  );
}
