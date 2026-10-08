import type { BlogStatus } from "@/features/blog/blog.types";

/** Each status in its own color, like the role and kind chips. */
const STATUS_CHIP: Record<BlogStatus, { label: string; className: string }> = {
  PUBLISHED: { label: "Published", className: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30" },
  SCHEDULED: { label: "Scheduled", className: "bg-sky-400/15 text-sky-300 ring-sky-400/30" },
  DRAFT: { label: "Draft", className: "bg-slate-400/15 text-slate-300 ring-slate-400/30" },
  ARCHIVED: { label: "Archived", className: "bg-slate-400/10 text-slate-400 ring-slate-400/20" },
};

export function BlogStatusChip({ status }: { status: BlogStatus }) {
  const chip = STATUS_CHIP[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${chip.className}`}>
      {chip.label}
    </span>
  );
}
