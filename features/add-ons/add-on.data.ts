import "server-only";

import { addOnService } from "@/features/add-ons/add-on.service";
import type { AddOn, AddOnListItem, PaginatedAddOnsResponse } from "@/features/add-ons/add-on.types";
import { createAddOnSchema, updateAddOnSchema } from "@/features/add-ons/add-on.validation";
import { UserFacingError } from "@/shared/lib/errors";
import { assertCan } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

/**
 * Add-ons data layer (admins, boat:edit): the catalog of extras boats can
 * offer. What a customer picks is priced from the boat's own offer list in
 * booking-request.data.ts, never from the browser.
 */

export async function listAddOns(filters?: Parameters<typeof addOnService.getAllAddOns>[0]): Promise<PaginatedAddOnsResponse> {
  await assertCan({ boat: ["edit"] });
  return addOnService.getAllAddOns(filters);
}

/** Catalog entries a boat can offer (the boat form). */
export async function listActiveAddOns(): Promise<AddOnListItem[]> {
  await assertCan({ boat: ["edit"] });
  return addOnService.getActiveAddOns();
}

export async function createAddOn(raw: unknown): Promise<AddOn> {
  await assertCan({ boat: ["edit"] });
  return addOnService.createAddOn(createAddOnSchema.parse(raw));
}

export async function updateAddOn(id: string, raw: unknown): Promise<AddOn> {
  await assertCan({ boat: ["edit"] });
  if (!isUuid(id)) throw new UserFacingError("Add-on not found", 404);
  return addOnService.updateAddOn(id, updateAddOnSchema.parse(raw));
}

export async function deleteAddOn(id: string): Promise<void> {
  await assertCan({ boat: ["edit"] });
  if (!isUuid(id)) throw new UserFacingError("Add-on not found", 404);
  await addOnService.deleteAddOn(id);
}
