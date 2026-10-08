import { notFound } from "next/navigation";
import { getBoatDetail } from "@/features/boats/boat.data";
import { listActiveAddOns } from "@/features/add-ons/add-on.data";
import {
  type CreateBoatInput,
  type PricingTierInput,
  type BoatAddOnAssignmentInput,
} from "@/features/boats/boat.validation";
import AdminAddUpdateBoatForm from "@/features/boats/components/forms/admin-create-edit-boat-form";
import { Suspense } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { normalizeCurrency } from "@/shared/lib/constants/currencies";

interface AdminBoatEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBoatEditPage({
  params,
}: AdminBoatEditPageProps) {
  const resolvedParams = await params;
  const boatId = resolvedParams.id;

  return (
    <div className="space-y-6">
      {/* Boat Edit Form with Suspense for progressive loading */}
      <Suspense fallback={<FormSkeleton />}>
        <BoatFormWithData boatId={boatId} />
      </Suspense>
    </div>
  );
}

// Separate component for data fetching to enable Suspense
async function BoatFormWithData({ boatId }: { boatId: string }) {
  const [boatData, availableAddOns] = await Promise.all([
    getBoatDetail(boatId),
    listActiveAddOns(),
  ]);

  if (!boatData) {
    notFound();
  }

  // Format pricing tiers to match form input schema
  const formattedPricingTiers: PricingTierInput[] =
    boatData.pricingTiers?.map((tier) => ({
      id: tier.id,
      hours: tier.hours,
      price: tier.price,
      name: tier.name || "",
      description: tier.description || "",
      isActive: tier.isActive,
      isDefault: tier.isDefault || false,
    })) || [];

  // Format offered add-ons to match the per-boat assignment schema
  const formattedBoatAddOns: BoatAddOnAssignmentInput[] =
    boatData.boatAddOns?.map((a) => ({
      id: a.id,
      addOnId: a.addOnId,
      priceCents: a.overridePriceCents,
      isComplimentary: a.isComplimentary,
      isActive: a.isActive,
    })) || [];

  // Transform database boat to form input format
  const boat: CreateBoatInput = {
    // Core Information
    name: boatData.name,
    displayTitle: boatData.displayTitle || null,
    description: boatData.description || null,
    category: boatData.category!,
    active: boatData.active ?? false,
    featured: boatData.featured ?? false,
    featuredOrder: boatData.featuredOrder || null,
    searchRankingScore: boatData.searchRankingScore || null,

    // Owner Information
    ownerId: boatData.ownerId,
    ownerNotes: boatData.ownerNotes || null,

    // Boat Specifications
    make: boatData.make || null,
    model: boatData.model || null,
    yearBuilt: boatData.yearBuilt || null,
    lengthFt: boatData.lengthFt,
    capacity: boatData.capacity,
    bathrooms: boatData.bathrooms || null,
    showers: boatData.showers || null,
    sleeps: boatData.sleeps || null,
    range: boatData.range || null,

    // Features
    features: boatData.features || [],
    safetyEquipment: boatData.safetyEquipment || null,

    // Media
    mainImage: boatData.mainImage || null,
    galleryImages: boatData.galleryImages || [],
    virtualTourUrl: boatData.virtualTourUrl || null,

    // Pricing
    currency: normalizeCurrency(boatData.currency),
    pricingTiers: formattedPricingTiers,
    boatAddOns: formattedBoatAddOns,
    weeklyRate: boatData.weeklyRate || null,
    monthlyRate: boatData.monthlyRate || null,
    depositAmount: boatData.depositAmount || null,
    cleaningFee: boatData.cleaningFee || null,

    // Location
    locationLabel: boatData.locationLabel || null,
    // Start from the saved point: saving null would clear the boat's map location.
    locationCoordinates: boatData.locationCoordinates,
    availableDestinations: boatData.availableDestinations || [],
    dockInfo: boatData.dockInfo || null,
    parkingInfo: boatData.parkingInfo || null,

    // Charter Options
    crewRequired: boatData.crewRequired ?? true,
    crewIncluded: boatData.crewIncluded ?? true,
    primaryCaptainUserId: boatData.primaryCaptainUserId || null,
    dayCharter: boatData.dayCharter ?? true,
    termCharter: boatData.termCharter ?? false,
    minimumCharterDays: boatData.minimumCharterDays || null,

    // Booking Options
    instantBook: boatData.instantBook ?? false,

    // Fuel Details
    fuelIncluded: boatData.fuelIncluded ?? false,

    // Rules & Instructions
    rules: boatData.rules || null,
    specialInstructions: boatData.specialInstructions || null,
    cancellationPolicy: boatData.cancellationPolicy || null,

    // Documentation
    registrationNumber: boatData.registrationNumber || null,
    hullId: boatData.hullId || null,
    insuranceInfo: boatData.insuranceInfo || null,
    insuranceExpiry: boatData.insuranceExpiry
      ? boatData.insuranceExpiry.toISOString()
      : null,

    // Maintenance
    lastMaintenanceDate: boatData.lastMaintenanceDate
      ? boatData.lastMaintenanceDate.toISOString()
      : null,
    nextMaintenanceDate: boatData.nextMaintenanceDate
      ? boatData.nextMaintenanceDate.toISOString()
      : null,
    maintenanceNotes: boatData.maintenanceNotes || null,
  };

  return (
    <AdminAddUpdateBoatForm boat={boat} boatId={boatId} availableAddOns={availableAddOns} />
  );
}

// Skeleton UI for the form loading state
function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[max(1600px,90vw)] space-y-6">
      {[1, 2, 3, 4, 5].map((section) => (
        <div
          key={section}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
