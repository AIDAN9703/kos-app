import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/database/db";
import { appSettings } from "@/database/schema";
import { DEFAULT_APP_SETTINGS } from "@/features/app-settings/app-settings.config";
import type { AppSettings } from "@/features/app-settings/app-settings.types";
import type { UpdateAppSettingsInput } from "@/features/app-settings/app-settings.validation";

const SETTINGS_ROW_ID = 1;

/** Postgres undefined_table — migration 0048 not applied yet. */
function isMissingAppSettingsTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "42P01"
  );
}

function toAppSettings(row: {
  serviceFeeBps: number;
  serviceFeeFixedCents: number;
  updatedAt: Date | null;
}): AppSettings {
  return {
    serviceFee: { bps: row.serviceFeeBps, fixedCents: row.serviceFeeFixedCents },
    updatedAt: row.updatedAt,
  };
}

/**
 * Read global app settings (server-only). Deduplicated per request via React
 * cache, so pricing paths that call this multiple times hit the DB once.
 * Falls back to defaults until the admin saves the row for the first time.
 */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  try {
    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, SETTINGS_ROW_ID))
      .limit(1);

    return toAppSettings(row ?? { ...DEFAULT_APP_SETTINGS, updatedAt: null });
  } catch (error) {
    if (isMissingAppSettingsTable(error)) {
      console.warn(
        "[app-settings] app_setting table missing — using defaults. Run: npm run db:migrate:prod"
      );
      return toAppSettings({ ...DEFAULT_APP_SETTINGS, updatedAt: null });
    }
    throw error;
  }
});

/** Upsert the singleton settings row. */
export async function saveAppSettings(
  input: UpdateAppSettingsInput,
  updatedByUserId: string
): Promise<AppSettings> {
  const [row] = await db
    .insert(appSettings)
    .values({
      id: SETTINGS_ROW_ID,
      serviceFeeBps: input.serviceFeeBps,
      serviceFeeFixedCents: input.serviceFeeFixedCents,
      updatedBy: updatedByUserId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        serviceFeeBps: input.serviceFeeBps,
        serviceFeeFixedCents: input.serviceFeeFixedCents,
        updatedBy: updatedByUserId,
        updatedAt: new Date(),
      },
    })
    .returning();

  return toAppSettings(row);
}
