import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";
import type { ProfileCompletionItem } from "../../profile.types";
import { surface } from "../surface";

/** A short checklist that finishes the profile. Hidden once everything is done. */
export function ProfileCompletion({ items }: { items: ProfileCompletionItem[] }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  const percent = Math.round((done / items.length) * 100);

  return (
    <section aria-labelledby="completion-heading" className={`flex flex-col p-6 ${surface}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="completion-heading" className="text-lg font-semibold tracking-tight text-primary">
          Complete your profile
        </h2>
        <span className="text-sm font-semibold tabular-nums text-primary">{percent}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
      <ul className="mt-4 space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            {item.done ? (
              <span className="flex items-center gap-2.5 py-1.5 text-sm text-slate-400 line-through">
                <Check className="h-4 w-4 text-success" />
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  "group -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-primary",
                  "transition-colors hover:bg-muted/60"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-4 w-4 rounded-full border-2 border-gray-300" aria-hidden />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
