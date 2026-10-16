"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { categoryLabel } from "@/features/owner-dashboard/owner-presentation";
import { missingForReview } from "../../listing-progress";
import { deleteListingAction, submitListingAction } from "../../listing.actions";
import {
  CAPTAIN_ARRANGEMENTS,
  defaultListingName,
  listingStepHref,
  ownerShareOf,
  type ListingStepId,
} from "../../listing.constants";
import type { ListingDraft } from "../../listing.types";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function Row({
  draft,
  step,
  title,
  missing,
  children,
}: {
  draft: ListingDraft;
  step: ListingStepId;
  title: string;
  missing?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-4 border-t border-gray-200 py-5">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          missing ? "border border-amber-400" : "bg-primary text-white"
        )}
      >
        {missing ? null : <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-primary">{title}</h2>
          <Link
            href={listingStepHref(draft.id, step)}
            className="text-sm font-semibold text-slate-600 underline-offset-4 hover:text-primary hover:underline"
          >
            Edit
          </Link>
        </div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{children}</div>
        {missing ? <p className="mt-1 text-sm font-medium text-amber-700">{missing}</p> : null}
      </div>
    </section>
  );
}

export function ReviewStep({ draft }: { draft: ListingDraft }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const missing = missingForReview(draft);
  const missingFor = (step: ListingStepId) => missing.find((m) => m.step === step)?.message;
  const canSubmit =
    (draft.status === "DRAFT" || draft.status === "CHANGES_REQUESTED") && missing.length === 0;
  const captain = CAPTAIN_ARRANGEMENTS.find((c) => c.value === draft.captainArrangement)?.label;

  function submit() {
    startTransition(async () => {
      const result = await submitListingAction(draft.id);
      if (!result.success) return setError(result.error);
      toast({
        title: "Sent to the KOS team",
        description: "We'll be in touch about your listing.",
      });
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Delete this listing? Its photos and details will be gone.")) return;
    startTransition(async () => {
      const result = await deleteListingAction(draft.id);
      if (!result.success) return setError(result.error);
      router.push("/owner/boats");
    });
  }

  return (
    <div>
      <div className="flex gap-4">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {draft.images[0] ? (
            <Image src={draft.images[0]} alt="" fill className="object-cover" sizes="128px" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-primary">
            {draft.displayTitle || draft.name}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {[
              categoryLabel(draft.category),
              `${draft.lengthFt} ft`,
              `${draft.capacity} guests`,
              draft.locationLabel,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Row draft={draft} step="basics" title="Your boat" missing={missingFor("basics")}>
          {defaultListingName(draft)}, {draft.lengthFt} ft, up to {draft.capacity} guests
        </Row>
        <Row draft={draft} step="location" title="Location" missing={missingFor("location")}>
          {draft.locationLabel || "Not added yet"}
        </Row>
        <Row draft={draft} step="photos" title="Photos" missing={missingFor("photos")}>
          {draft.images.length} photo{draft.images.length === 1 ? "" : "s"}
        </Row>
        <Row draft={draft} step="details" title="Description" missing={missingFor("details")}>
          {draft.description ? (
            <span className="line-clamp-2">{draft.description}</span>
          ) : (
            "Not written yet"
          )}
        </Row>
        <Row draft={draft} step="trips" title="Trips and prices" missing={missingFor("trips")}>
          {draft.trips.length > 0
            ? draft.trips
                .map(
                  (t) =>
                    `${t.hours}h: you earn ${usd(t.ownerRate ?? ownerShareOf(t.price, draft.markupPercent))}, guests pay ${usd(t.price)}`
                )
                .join(" · ")
            : "No trips priced yet"}
          {captain ? (
            <span className="block">
              {captain}
              {draft.fuelIncluded ? " · fuel included" : ""}
            </span>
          ) : null}
        </Row>
        <Row
          draft={draft}
          step="rules"
          title="Rules and cancellations"
          missing={missingFor("rules")}
        >
          {draft.cancellationPolicy || "No policy chosen"}
        </Row>
        <Row draft={draft} step="documents" title="Documents" missing={missingFor("documents")}>
          {[
            draft.hullId && "HIN",
            draft.registrationNumber && "registration",
            draft.insuranceInfo && "insurance",
          ]
            .filter(Boolean)
            .join(", ") || "Nothing added yet"}
        </Row>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-6">
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {draft.status === "IN_REVIEW" ? (
          <p className="text-[15px] leading-7 text-slate-600">
            Submitted{" "}
            {draft.submittedAt
              ? new Date(draft.submittedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })
              : ""}
            . The KOS team reviews every listing and will contact you about next steps.
          </p>
        ) : draft.status === "APPROVED" ? (
          <p className="text-[15px] leading-7 text-slate-600">
            Your listing is approved.{" "}
            <Link
              href={`/owner/boats/${draft.id}`}
              className="font-semibold text-primary hover:underline"
            >
              Manage it in your owner portal
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="text-sm font-semibold text-slate-500 underline-offset-4 hover:text-destructive hover:underline"
            >
              Delete this listing
            </button>
            <Button
              onClick={submit}
              disabled={!canSubmit || pending}
              size="lg"
              className="h-11 rounded-full px-7"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {draft.status === "CHANGES_REQUESTED" ? "Submit again" : "Submit for review"}
            </Button>
          </div>
        )}
        {missing.length > 0 && draft.status !== "IN_REVIEW" && draft.status !== "APPROVED" ? (
          <p className="mt-3 text-right text-sm text-slate-500">
            {missing.length} thing{missing.length === 1 ? "" : "s"} left before you can submit.
          </p>
        ) : null}
      </div>
    </div>
  );
}
