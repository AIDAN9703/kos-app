import { getMarketingOverview } from "@/features/marketing/marketing.data";
import { MarketingTabs } from "@/features/marketing/components/MarketingTabs";
import { MarketingNumbers } from "@/features/marketing/components/MarketingNumbers";
import { SenderCard } from "@/features/marketing/components/SenderCard";
import { NewCampaignButton } from "@/features/marketing/components/NewCampaignButton";
import { CampaignsTable } from "@/features/marketing/components/CampaignsTable";
import { GlassHeader, GlassPage } from "@/shared/admin/components/glass";

export default async function MarketingPage() {
  const { summary, campaigns, mailingAddress, from } = await getMarketingOverview();
  return (
    <GlassPage compact>
      <GlassHeader title="Marketing" actions={<NewCampaignButton />} />
      <div className="flex flex-col gap-4">
        <MarketingTabs />
        <MarketingNumbers summary={summary} />
        <SenderCard from={from} mailingAddress={mailingAddress} />
        <CampaignsTable campaigns={campaigns} />
      </div>
    </GlassPage>
  );
}
