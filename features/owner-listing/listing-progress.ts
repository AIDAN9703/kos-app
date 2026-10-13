import { LISTING_STEPS, MIN_PHOTOS, type ListingStepId } from "./listing.constants";
import type { ListingDraft, StepProgress } from "./listing.types";

/** Minimum description a guest can decide on. */
const MIN_DESCRIPTION = 120;

/** Which steps have what review needs. Pure, so pages and the submit check agree. */
export function stepProgress(d: ListingDraft): StepProgress {
  return {
    // Make and model can be "Other" (stored empty); KOS fills them in on review.
    basics: Boolean(d.yearBuilt && d.lengthFt && d.capacity),
    location: Boolean(d.locationLabel),
    photos: d.images.length >= MIN_PHOTOS,
    details: Boolean(d.displayTitle && (d.description?.length ?? 0) >= MIN_DESCRIPTION),
    trips: d.trips.length > 0 && Boolean(d.captainArrangement),
    rules: Boolean(d.cancellationPolicy),
    documents: Boolean(d.hullId && d.registrationNumber && d.insuranceInfo),
  };
}

/** What still stops the listing from going to review, in the owner's words. */
export function missingForReview(d: ListingDraft): { step: ListingStepId; message: string }[] {
  const done = stepProgress(d);
  const missing: { step: ListingStepId; message: string }[] = [];
  if (!done.basics) missing.push({ step: "basics", message: "Finish the boat basics" });
  if (!done.location) missing.push({ step: "location", message: "Add where the boat leaves from" });
  if (!done.photos) {
    const left = MIN_PHOTOS - d.images.length;
    missing.push({ step: "photos", message: `Add ${left} more photo${left === 1 ? "" : "s"}` });
  }
  if (!done.details) {
    missing.push({
      step: "details",
      message: d.displayTitle
        ? `Write a description of at least ${MIN_DESCRIPTION} characters`
        : "Add a title and description",
    });
  }
  if (!done.trips)
    missing.push({ step: "trips", message: "Price at least one trip and pick a captain option" });
  if (!done.rules) missing.push({ step: "rules", message: "Choose a cancellation policy" });
  if (!done.documents) {
    missing.push({ step: "documents", message: "Add the HIN, registration number and insurance" });
  }
  return missing;
}

/** Where "Continue listing" should land: the first step still missing something. */
export function resumeStep(d: ListingDraft): ListingStepId {
  const done = stepProgress(d);
  const first = LISTING_STEPS.find((s) => s.id !== "review" && !done[s.id]);
  return first?.id ?? "review";
}

/** 0–100 for the progress bar. */
export function percentComplete(d: ListingDraft): number {
  const values = Object.values(stepProgress(d));
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

export { MIN_DESCRIPTION };
