import "server-only";

import { getAppSettings, saveAppSettings } from "@/features/app-settings/app-settings.service";
import type { AppSettings } from "@/features/app-settings/app-settings.types";
import { updateAppSettingsSchema } from "@/features/app-settings/app-settings.validation";
import type { ServiceFee } from "@/shared/lib/utils/pricing-utils";
import { assertCan } from "@/shared/lib/utils/auth-utils";

/**
 * App settings data layer: the card fee the public booking pages show (it's
 * on every price breakdown anyway), and the settings page for admins
 * (settings:edit).
 */

/** The card fee new bookings are priced with. The amount charged is always recomputed at checkout. */
export async function getServiceFee(): Promise<ServiceFee> {
  return (await getAppSettings()).serviceFee;
}

export async function getSettingsForAdmin(): Promise<AppSettings> {
  await assertCan({ settings: ["edit"] });
  return getAppSettings();
}

export async function updateSettings(raw: unknown): Promise<AppSettings> {
  const admin = await assertCan({ settings: ["edit"] });
  return saveAppSettings(updateAppSettingsSchema.parse(raw), admin.id);
}
