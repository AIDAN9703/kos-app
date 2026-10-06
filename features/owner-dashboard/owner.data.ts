import "server-only";

import * as ownerService from "@/features/owner-dashboard/owner.service";
import type {
  OwnerBoat,
  OwnerBoatDetail,
  OwnerCharter,
  OwnerIdentity,
} from "@/features/owner-dashboard/owner.types";
import { AccessDenied } from "@/shared/lib/errors";
import { assertSignedIn, hasRole, type SessionUser } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Owner portal data layer: a boat owner's own fleet, charters and payouts,
 * read-only. Every function takes the owner from the session, so an owner
 * only ever sees boats they own.
 */

async function assertOwner(): Promise<SessionUser> {
  const user = await assertSignedIn();
  if (!hasRole(user, "owner")) throw new AccessDenied();
  return user;
}

export async function getMyOwnerIdentity(): Promise<OwnerIdentity> {
  const owner = await assertOwner();
  return ownerService.getOwnerIdentity(owner.id);
}

export async function getMyBoats(): Promise<OwnerBoat[]> {
  const owner = await assertOwner();
  return ownerService.getOwnerBoats(owner.id);
}

/** One of the owner's boats; anyone else's boat id is a miss. */
export async function getMyBoat(boatId: string): Promise<OwnerBoatDetail | null> {
  const owner = await assertOwner();
  return isUuid(boatId) ? ownerService.getOwnerBoat(owner.id, boatId) : null;
}

/** Dated charters on the owner's boats, optionally for one boat. */
export async function getMyCharters(boatId?: string): Promise<OwnerCharter[]> {
  const owner = await assertOwner();
  if (boatId !== undefined && !isUuid(boatId)) return [];
  return ownerService.getOwnerCharters(owner.id, boatId);
}
