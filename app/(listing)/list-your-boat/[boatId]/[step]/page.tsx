import { notFound } from "next/navigation";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { StepFrame } from "@/features/owner-listing/components/StepFrame";
import { DetailsForm } from "@/features/owner-listing/components/steps/DetailsForm";
import { DocumentsForm } from "@/features/owner-listing/components/steps/DocumentsForm";
import { EditBasics } from "@/features/owner-listing/components/steps/EditBasics";
import { LocationForm } from "@/features/owner-listing/components/steps/LocationForm";
import { PhotosForm } from "@/features/owner-listing/components/steps/PhotosForm";
import { ReviewStep } from "@/features/owner-listing/components/steps/ReviewStep";
import { RulesForm } from "@/features/owner-listing/components/steps/RulesForm";
import { TripsForm, type PriceHints } from "@/features/owner-listing/components/steps/TripsForm";
import { estimateEarnings, estimateGroupFor } from "@/features/owner-listing/estimate";
import { getComparableBoats } from "@/features/owner-listing/estimate.data";
import { getBoatCatalog } from "@/features/boat-catalog/boat-catalog.data";
import { isListingStep } from "@/features/owner-listing/listing.constants";
import { getMyListing } from "@/features/owner-listing/listing.data";
import type { ListingDraft } from "@/features/owner-listing/listing.types";

async function priceHints(draft: ListingDraft): Promise<PriceHints> {
  const boats = await getComparableBoats();
  const hints: PriceHints = {};
  for (const hours of [4, 6, 8] as const) {
    const e = estimateEarnings(boats, {
      group: estimateGroupFor(draft.category),
      lengthFt: draft.lengthFt,
      hours,
      tripsPerMonth: 1,
    });
    if (e) hints[hours] = { low: e.low, high: e.high };
  }
  return hints;
}

/** One step of an owner's own listing; any other boat id is a 404. */
export default async function ListingStepPage({
  params,
}: {
  params: Promise<{ boatId: string; step: string }>;
}) {
  const [, { boatId, step }] = await Promise.all([requireAuth(), params]);
  if (!isListingStep(step)) notFound();
  const draft = await getMyListing(boatId);
  if (!draft) notFound();

  // While it's being built a save moves on; once approved, edits stay put.
  const advance = draft.status !== "APPROVED";

  let form: React.ReactNode;
  switch (step) {
    case "basics":
      form = <EditBasics draft={draft} advance={advance} catalog={await getBoatCatalog()} />;
      break;
    case "location":
      form = <LocationForm draft={draft} advance={advance} />;
      break;
    case "photos":
      form = <PhotosForm draft={draft} advance={advance} />;
      break;
    case "details":
      form = <DetailsForm draft={draft} advance={advance} />;
      break;
    case "trips":
      form = <TripsForm draft={draft} advance={advance} hints={await priceHints(draft)} />;
      break;
    case "rules":
      form = <RulesForm draft={draft} advance={advance} />;
      break;
    case "documents":
      form = <DocumentsForm draft={draft} advance={advance} />;
      break;
    case "review":
      form = <ReviewStep draft={draft} />;
      break;
  }

  return (
    <StepFrame draft={draft} step={step}>
      {form}
    </StepFrame>
  );
}
