import AdminAddUpdateBoatForm from "@/features/boats/components/forms/admin-create-edit-boat-form";
import { listActiveAddOns } from "@/features/add-ons/add-on.data";

export default async function AdminCreateBoatPage() {
  const availableAddOns = await listActiveAddOns();
  return <AdminAddUpdateBoatForm availableAddOns={availableAddOns} />;
}
