import { pgEnum } from "drizzle-orm/pg-core";

/** A campaign is written as a draft, then sent now or scheduled. */
export const marketingCampaignStatusEnum = pgEnum("MarketingCampaignStatus", [
  "DRAFT",
  "SCHEDULED",
  "SENT",
  "CANCELLED",
]);
