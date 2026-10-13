import AdminAddUpdateBoatForm from "@/features/boats/components/forms/admin-create-edit-boat-form";
import { listActiveAddOns } from "@/features/add-ons/add-on.data";
import { getBoatCatalog } from "@/features/boat-catalog/boat-catalog.data";
import { BackButton } from "@/shared/admin/components/BackButton";

export default async function AdminCreateBoatPage() {
  const [availableAddOns, catalog] = await Promise.all([listActiveAddOns(), getBoatCatalog()]);
  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <header className="flex items-center gap-4">
        <BackButton href="/admin/boats" />
        <h1 className="text-2xl font-semibold tracking-tight">New boat</h1>
      </header>
      <AdminAddUpdateBoatForm availableAddOns={availableAddOns} catalog={catalog} />
    </div>
  );
}
