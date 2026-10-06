import { getSettingsForAdmin } from "@/features/app-settings/app-settings.data";
import { AdminSettingsClient } from "@/features/app-settings/components/AdminSettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettingsForAdmin();
  return <AdminSettingsClient settings={settings} />;
}
