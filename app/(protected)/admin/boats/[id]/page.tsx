import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Edit } from "lucide-react";
import { getBoatById } from "@/features/boats/actions/boat-actions";
import { AdminBoatProfileHeader } from "@/features/boats/components/AdminBoatProfileHeader";
import { AdminBoatDetails } from "@/features/boats/components/AdminBoatDetails";
import { Button } from "@/shared/components/ui/button";

interface BoatDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BoatDetailPage({ params }: BoatDetailPageProps) {
  const resolvedParams = await params;
  const boatId = resolvedParams.id;

  const boatData = await getBoatById(boatId);

  if (!boatData) {
    notFound();
  }

  const boatActions = (
    <>
      <Link href={`/admin/boats/${boatId}/calendar`}>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Calendar
        </Button>
      </Link>
      <Link href={`/admin/boats/${boatId}/edit`}>
        <Button size="sm" className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Boat
        </Button>
      </Link>
    </>
  );

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <AdminBoatProfileHeader boat={boatData} actions={boatActions} />
      <AdminBoatDetails boat={boatData} />
    </div>
  );
}
