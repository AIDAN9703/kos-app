import { AssistantView } from "@/features/admin/assistant/AssistantView";
import { getSession } from "@/shared/lib/utils/auth-utils";

export const dynamic = "force-dynamic";

export default async function AdminAssistantPage() {
  const session = await getSession();
  const firstName = session?.user?.name?.split(/\s+/)[0] ?? null;
  return <AssistantView firstName={firstName} configured={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
