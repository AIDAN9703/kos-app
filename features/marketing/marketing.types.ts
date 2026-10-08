/** Shapes the marketing pages show (from marketing.data.ts). */

type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT" | "CANCELLED";

export interface MarketingContactRow {
  id: string;
  email: string;
  name: string | null;
  source: string;
  subscribed: boolean;
  /** False while a change is waiting to be pushed to Resend. */
  synced: boolean;
  createdAt: Date;
}

export interface ContactSummary {
  total: number;
  subscribed: number;
  unsubscribed: number;
  /** Rows whose latest state hasn't reached Resend yet. */
  pending: number;
  /** Subscribed contacts per list, largest first. */
  sources: { source: string; subscribed: number }[];
}

export interface CampaignListItem {
  id: string;
  name: string;
  subject: string;
  audience: string;
  status: CampaignStatus;
  scheduledAt: Date | null;
  sentAt: Date | null;
  recipientCount: number | null;
  updatedAt: Date;
}

export interface Campaign extends CampaignListItem {
  previewText: string;
  heading: string;
  body: string;
  imageUrl: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  resendBroadcastId: string | null;
}

export const AUDIENCE_ALL = "ALL";
