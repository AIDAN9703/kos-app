import "server-only";

import { getBoatShowcase as loadShowcase } from "@/features/boats/showcase/boat-showcase.service";
import { assertCan } from "@/shared/lib/utils/auth-utils";

/** The boat page's calendar and money picture: admins (boat:edit), like the boat detail. */
export async function getBoatShowcase(boatId: string, timezone: string | null) {
  await assertCan({ boat: ["edit"] });
  return loadShowcase(boatId, timezone);
}
