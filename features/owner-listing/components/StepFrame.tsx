import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";
import { percentComplete, stepProgress } from "../listing-progress";
import { LISTING_STEPS, listingStepHref, type ListingStepId } from "../listing.constants";
import type { ListingDraft } from "../listing.types";
import {
  ListingPreviewCard,
  ListingPreviewProvider,
  type PreviewData,
} from "./preview/ListingPreview";

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** What the preview card starts from: the saved listing, or the first step's answers. */
function previewFrom(draft: ListingDraft | null, start?: Partial<PreviewData>): PreviewData {
  const trip = draft?.trips.length
    ? draft.trips.reduce((a, b) => (b.price < a.price ? b : a))
    : null;
  return {
    category: draft?.category ?? start?.category ?? "YACHT",
    make: text(draft?.make ?? start?.make),
    model: text(draft?.model ?? start?.model),
    yearBuilt: text(draft?.yearBuilt ?? start?.yearBuilt),
    lengthFt: text(draft?.lengthFt ?? start?.lengthFt),
    capacity: text(draft?.capacity ?? start?.capacity),
    locationLabel: text(draft?.locationLabel),
    image: draft?.images[0] ?? null,
    displayTitle: text(draft?.displayTitle),
    fromPrice: trip,
  };
}

const DESCRIPTIONS: Record<ListingStepId, string> = {
  basics: "The essentials guests filter by. You can change them later.",
  location: "The marina or dock where guests board.",
  photos: "Listings with bright, wide photos of every side book far more often.",
  details: "A title and a description in your own words: what a day aboard feels like.",
  trips: "Set a price for each trip length you offer. Guests see these prices.",
  rules: "What guests agree to before they book.",
  documents: "Only the KOS team sees these. We check them before the boat goes live.",
  review: "Check everything once more, then send it to the KOS team.",
};

/** The banner over every step when the listing isn't a plain draft. */
function StatusBanner({ draft }: { draft: ListingDraft }) {
  if (draft.status === "CHANGES_REQUESTED") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <p className="font-semibold">The KOS team asked for a few changes</p>
        {draft.reviewNote ? <p className="mt-1 whitespace-pre-line">{draft.reviewNote}</p> : null}
        <p className="mt-1">Make them, then submit again from the last step.</p>
      </div>
    );
  }
  if (draft.status === "IN_REVIEW") {
    return (
      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
        <span className="font-semibold text-primary">In review.</span> The KOS team is checking your
        listing. Changes you save now are included.
      </div>
    );
  }
  if (draft.status === "APPROVED") {
    return (
      <div className="rounded-xl bg-success-soft px-4 py-3 text-sm leading-6 text-success">
        <span className="font-semibold">
          {draft.active ? "Live on kosyachts.com." : "Approved, hidden."}
        </span>{" "}
        Changes you save show on your listing right away.
      </div>
    );
  }
  return null;
}

/**
 * Every step's page: the step list on the left (desktop), a progress line on
 * phones, the title, and the step's form.
 */
export function StepFrame({
  draft,
  step,
  start,
  children,
}: {
  /** Null on the very first step, before the listing exists. */
  draft: ListingDraft | null;
  step: ListingStepId;
  /** First-step answers carried in the URL (before the listing exists). */
  start?: Partial<PreviewData>;
  children: ReactNode;
}) {
  const index = LISTING_STEPS.findIndex((s) => s.id === step);
  const current = LISTING_STEPS[index];
  const done = draft ? stepProgress(draft) : null;
  const percent = draft ? percentComplete(draft) : 0;

  return (
    <ListingPreviewProvider initial={previewFrom(draft, start)}>
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-8 sm:py-10 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[200px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <nav aria-label="Listing steps" className="sticky top-24">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {draft ? `${percent}% complete` : "New listing"}
            </p>
            <ol className="mt-4 space-y-1">
              {LISTING_STEPS.map((s) => {
                const isCurrent = s.id === step;
                const isDone = s.id !== "review" && Boolean(done?.[s.id]);
                const content = (
                  <>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        isDone
                          ? "border-primary bg-primary text-white"
                          : isCurrent
                            ? "border-primary"
                            : "border-gray-300"
                      )}
                    >
                      {isDone ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
                    </span>
                    {s.label}
                  </>
                );
                const className = cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
                  isCurrent ? "font-semibold text-primary" : "text-slate-600",
                  draft && !isCurrent && "hover:bg-white/80 hover:text-primary"
                );
                return (
                  <li key={s.id}>
                    {draft ? (
                      <Link
                        href={listingStepHref(draft.id, s.id)}
                        aria-current={isCurrent ? "step" : undefined}
                        className={className}
                      >
                        {content}
                      </Link>
                    ) : (
                      <span className={className}>{content}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 rounded-3xl bg-white p-5 shadow-[0_20px_60px_-36px_rgba(15,30,45,0.4)] ring-1 ring-black/5 sm:p-10">
          <div className="max-w-2xl">
            <div className="lg:hidden">
              <p className="text-xs font-semibold text-slate-500">
                Step {index + 1} of {LISTING_STEPS.length} · {current.label}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.max(((index + 1) / LISTING_STEPS.length) * 100, 4)}%` }}
                />
              </div>
            </div>

            {draft ? (
              <div className="mt-6 lg:mt-0 [&:empty]:hidden">
                <StatusBanner draft={draft} />
              </div>
            ) : null}

            <h1 className="mt-6 text-3xl font-black tracking-tight text-primary sm:text-4xl">
              {current.title}
            </h1>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">{DESCRIPTIONS[step]}</p>

            <div className="mt-8">{children}</div>
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <ListingPreviewCard />
          </div>
        </aside>
      </div>
    </ListingPreviewProvider>
  );
}
