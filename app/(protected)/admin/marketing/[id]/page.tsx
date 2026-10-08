import { notFound } from "next/navigation";
import { getCampaignEditor } from "@/features/marketing/marketing.data";
import { CampaignEditor } from "@/features/marketing/components/CampaignEditor";
import { GlassPage } from "@/shared/admin/components/glass";
import { getSession } from "@/shared/lib/utils/auth-utils";
import { isUuid } from "@/shared/lib/utils/general-utils";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [editor, session] = await Promise.all([getCampaignEditor(id), getSession()]);
  if (!editor) notFound();
  return (
    <GlassPage>
      <CampaignEditor
        {...editor}
        myEmail={session?.user.email ?? ""}
        myFirstName={session?.user.name?.split(/\s+/)[0] || "there"}
      />
    </GlassPage>
  );
}
