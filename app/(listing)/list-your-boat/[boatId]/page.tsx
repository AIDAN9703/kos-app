import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/shared/lib/utils/auth-utils";
import { resumeStep } from "@/features/owner-listing/listing-progress";
import { listingStepHref } from "@/features/owner-listing/listing.constants";
import { getMyListing } from "@/features/owner-listing/listing.data";

/** "Continue listing": the first step that still needs something. */
export default async function ResumeListingPage({
  params,
}: {
  params: Promise<{ boatId: string }>;
}) {
  const [, { boatId }] = await Promise.all([requireAuth(), params]);
  const draft = await getMyListing(boatId);
  if (!draft) notFound();
  redirect(listingStepHref(draft.id, resumeStep(draft)));
}
