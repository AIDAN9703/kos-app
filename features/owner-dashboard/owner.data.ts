import "server-only";

import { getMyOwnerContext } from "@/features/owner-accounts/owner-accounts.data";
import * as ownerService from "@/features/owner-dashboard/owner.service";
import type {
  OwnerBoat,
  OwnerBoatDetail,
  OwnerCharter,
  OwnerView,
} from "@/features/owner-dashboard/owner.types";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Owner portal data layer: one owner's fleet, charters and payouts,
 * read-only. The owner comes from the session (one the person belongs to,
 * never one from the URL). Managers get the same boats and charters with
 * every money figure left out.
 */

/** Which owner the portal shows, and what this person may see of it. */
export async function getMyOwnerView(): Promise<OwnerView> {
  const { current, memberships, canSeeMoney } = await getMyOwnerContext();
  return {
    accountId: current.accountId,
    accountName: current.accountName,
    role: current.role,
    canSeeMoney,
    memberships,
  };
}

export async function getMyBoats(): Promise<OwnerBoat[]> {
  const { current } = await getMyOwnerContext();
  return ownerService.getOwnerBoats(current.accountId);
}

/** One of the owner's boats; anyone else's boat id is a miss. */
export async function getMyBoat(boatId: string): Promise<OwnerBoatDetail | null> {
  const { current, canSeeMoney } = await getMyOwnerContext();
  const boat = isUuid(boatId) ? await ownerService.getOwnerBoat(current.accountId, boatId) : null;
  if (!boat || canSeeMoney) return boat;
  return { ...boat, tiers: boat.tiers.map((t) => ({ ...t, ownerPayoutCents: null })) };
}

/** Dated charters on the owner's boats, optionally for one boat. */
export async function getMyCharters(boatId?: string): Promise<OwnerCharter[]> {
  const { current, canSeeMoney } = await getMyOwnerContext();
  if (boatId !== undefined && !isUuid(boatId)) return [];
  const charters = await ownerService.getOwnerCharters(current.accountId, boatId);
  return canSeeMoney
    ? charters
    : charters.map((c) => ({ ...c, payoutCents: null, paidOutCents: 0 }));
}
