import "server-only";

import type { ZodTypeAny, z } from "zod";
import { invalidFieldsFrom, UserFacingError } from "@/shared/lib/errors";
import { assertCan, assertSignedIn } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";
import { resolveMakeAndModel } from "@/features/boat-catalog/boat-catalog.service";
import { missingForReview } from "./listing-progress";
import { defaultListingName } from "./listing.constants";
import * as listingService from "./listing.service";
import type { ListingDraft, ListingForReview } from "./listing.types";
import { basicsSchema, stepSchemas, type EditableStep } from "./listing.validation";

/**
 * "List your boat" data layer. Anyone signed in may start a listing (that
 * makes them an owner); after that every read and write is scoped to the
 * caller's own self-listed boats. Review is for staff who can edit boats.
 */

function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw invalidFieldsFrom(result.error);
  return result.data;
}

export async function startListing(input: unknown): Promise<string> {
  const me = await assertSignedIn("Sign in to list your boat");
  const { make, model, ...basics } = parse(basicsSchema, input);
  await listingService.ensureOwnerAccount(me.id);
  // Owners pick from the catalog; "Other" (or anything unlisted) stays empty for KOS to fill in.
  const catalog = await resolveMakeAndModel({ make, model }, { canAdd: false });
  return listingService.createDraft(
    me.id,
    { ...basics, makeId: catalog.makeId, modelId: catalog.modelId },
    defaultListingName({ ...basics, make: catalog.makeName, model: catalog.modelName })
  );
}

export async function getMyListing(boatId: string): Promise<ListingDraft | null> {
  const me = await assertSignedIn();
  return isUuid(boatId) ? listingService.getDraft(me.id, boatId) : null;
}

/** Saves one step of the owner's own listing; only that step's fields. */
export async function saveListingStep(boatId: string, step: EditableStep, input: unknown) {
  const me = await assertSignedIn();
  if (!isUuid(boatId)) throw new UserFacingError("Listing not found", 404);

  switch (step) {
    case "trips":
      return listingService.saveTrips(me.id, boatId, parse(stepSchemas.trips, input));
    case "photos": {
      const { images } = parse(stepSchemas.photos, input);
      return listingService.updateDraft(me.id, boatId, {
        mainImage: images[0] ?? null,
        galleryImages: images.slice(1),
      });
    }
    case "basics": {
      const { make, model, ...basics } = parse(stepSchemas.basics, input);
      const draft = await listingService.getDraft(me.id, boatId);
      if (!draft) throw new UserFacingError("That listing isn't yours or no longer exists.", 404);
      const catalog = await resolveMakeAndModel({ make, model }, { canAdd: false });
      // A name the owner never changed keeps describing the boat.
      const name =
        draft.name === defaultListingName(draft)
          ? defaultListingName({ ...basics, make: catalog.makeName, model: catalog.modelName })
          : draft.name;
      return listingService.updateDraft(me.id, boatId, {
        ...basics,
        name,
        makeId: catalog.makeId,
        modelId: catalog.modelId,
      });
    }
    case "details": {
      const { name, ...rest } = parse(stepSchemas.details, input);
      // name is required on the boat; keep the year/make/model one if cleared.
      return listingService.updateDraft(me.id, boatId, name ? { ...rest, name } : rest);
    }
    default:
      return listingService.updateDraft(me.id, boatId, parse(stepSchemas[step], input));
  }
}

export async function submitMyListing(boatId: string): Promise<void> {
  const me = await assertSignedIn();
  const draft = isUuid(boatId) ? await listingService.getDraft(me.id, boatId) : null;
  if (!draft) throw new UserFacingError("Listing not found", 404);
  const missing = missingForReview(draft);
  if (missing.length > 0)
    throw new UserFacingError(`Almost there: ${missing[0].message.toLowerCase()}.`);
  await listingService.submitDraft(me.id, boatId);
}

export async function deleteMyListing(boatId: string): Promise<void> {
  const me = await assertSignedIn();
  if (!isUuid(boatId)) throw new UserFacingError("Listing not found", 404);
  await listingService.deleteDraft(me.id, boatId);
}

export async function setMyListingLive(boatId: string, live: boolean): Promise<void> {
  const me = await assertSignedIn();
  if (!isUuid(boatId)) throw new UserFacingError("Listing not found", 404);
  await listingService.setListingLive(me.id, boatId, live);
}

/** Upload route: boat photos are allowed for staff and for the boat's self-listing owner. */
export async function mayAddPhotosTo(userId: string, boatId: string): Promise<boolean> {
  return isUuid(boatId) && listingService.isOwnListing(userId, boatId);
}

// ── KOS review ──────────────────────────────────────────────────────────────

export async function getReviewQueue(): Promise<ListingForReview[]> {
  await assertCan({ boat: ["edit"] });
  return listingService.listForReview();
}

export async function countListingsAwaitingReview(): Promise<number> {
  await assertCan({ boat: ["edit"] });
  return listingService.countAwaitingReview();
}

export async function getListingForReview(boatId: string): Promise<ListingForReview | null> {
  await assertCan({ boat: ["edit"] });
  return isUuid(boatId) ? listingService.getForReview(boatId) : null;
}

export async function approveListing(boatId: string): Promise<void> {
  const me = await assertCan({ boat: ["edit"] });
  if (!isUuid(boatId)) throw new UserFacingError("Listing not found", 404);
  await listingService.approve(me.id, boatId);
}

export async function sendListingBack(boatId: string, note: unknown): Promise<void> {
  const me = await assertCan({ boat: ["edit"] });
  if (!isUuid(boatId)) throw new UserFacingError("Listing not found", 404);
  const text = typeof note === "string" ? note.trim() : "";
  if (text.length < 5) throw new UserFacingError("Tell the owner what to change.");
  await listingService.sendBack(me.id, boatId, text.slice(0, 1000));
}
