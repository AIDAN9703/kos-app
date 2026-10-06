/** A boat's subscribed external (iCal) calendar, as the admin settings show it. */
export interface ExternalCalendarListItem {
  id: string;
  name: string;
  icalUrl: string;
  syncEnabled: boolean;
  lastSyncedAt: Date | null;
  lastSyncStatus: "PENDING" | "SUCCESS" | "ERROR" | null;
  lastSyncError: string | null;
  lastEventCount: number | null;
}
