"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/shared/lib/hooks/use-toast";
import {
  createBoatSchema,
  updateBoatSchema,
  type CreateBoatInput,
  type UpdateBoatInput,
} from "@/features/boats/boat.validation";
import { createBoat, updateBoat } from "@/features/boats/boat.actions";
import { MediaSection } from "./sections/MediaSection";
import { useBoatImages } from "./hooks/useBoatImages";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { SpecsSection } from "./sections/SpecsSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { PricingSection } from "./sections/PricingSection";
import { BoatAddOnsSection } from "./sections/BoatAddOnsSection";
import { LocationSection } from "./sections/LocationSection";
import { CharterOptionsSection } from "./sections/CharterOptionsSection";
import { OwnerSection } from "./sections/OwnerSection";
import type { AddOnListItem } from "@/features/add-ons/add-on.types";

interface AdminBoatFormProps {
  boat?: CreateBoatInput;
  boatId?: string;
  /** Active catalog add-ons, for the per-boat "Add-ons offered" section. */
  availableAddOns?: AddOnListItem[];
}

export default function AdminAddUpdateBoatForm({
  boat,
  boatId,
  availableAddOns = [],
}: AdminBoatFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Determine if we're creating or updating
  const isCreating = !boatId;
  const formSchema = isCreating ? createBoatSchema : updateBoatSchema;

  const methods = useForm<CreateBoatInput | UpdateBoatInput>({
    resolver: zodResolver(formSchema),
    defaultValues: boat || {
      // Required fields with defaults
      name: "",
      category: "PONTOON",
      lengthFt: 1,
      capacity: 1,
      features: ["Standard features"],
      currency: "USD",
      pricingTiers: [],
      boatAddOns: [],

      // Boolean fields
      active: false,
      featured: false,
      featuredOrder: undefined,
      searchRankingScore: undefined,
      crewRequired: true,
      crewIncluded: true,
      dayCharter: true,
      termCharter: false,
      instantBook: false,
      fuelIncluded: false,
      ownerId: "",
      ownerNotes: null,
    },
  });

  const { formState } = methods;
  const { isSubmitting } = formState;

  const {
    images,
    updateFormImages,
    handleUpload,
    handleReorder,
    handleDelete,
  } = useBoatImages(methods, {
    mainImage: boat?.mainImage,
    galleryImages: boat?.galleryImages,
  });

  // Handle form submission
  async function onSubmit(data: CreateBoatInput | UpdateBoatInput) {
    try {
      setError(null);
      // Ensure form has latest image data
      updateFormImages(images);

      if (isCreating) {
        const result = await createBoat(data as CreateBoatInput);
        if (!result.success) {
          const msg = result.error ?? "Failed to create boat";
          setError(msg);
          toast({ title: "Error", description: msg, variant: "destructive" });
          return;
        }
        toast({ title: "Success", description: "Boat created successfully." });
        router.push("/admin/boats");
      } else {
        const result = await updateBoat(boatId!, data);
        if (!result.success) {
          const msg = result.error ?? "Failed to update boat";
          setError(msg);
          toast({ title: "Error", description: msg, variant: "destructive" });
          return;
        }
        toast({ title: "Success", description: "Boat updated successfully." });
        router.push(`/admin/boats/${boatId}`);
      }

      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to save boat. Please try again.";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  const submit = methods.handleSubmit(onSubmit);

  return (
    <FormProvider {...methods}>
      <form onSubmit={submit} className="mx-auto w-full max-w-[max(1600px,90vw)] space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <BasicInfoSection />
        <OwnerSection />
        <SpecsSection />
        <FeaturesSection />
        <MediaSection
          images={images}
          onUpload={handleUpload}
          onReorder={handleReorder}
          onDelete={handleDelete}
          boatId={boatId}
          boatName={methods.getValues("name") || "boat"}
        />
        <PricingSection />
        <BoatAddOnsSection availableAddOns={availableAddOns} />
        <LocationSection />
        <CharterOptionsSection />

        {/* Submit buttons */}
        <div className="flex justify-between">
          <Button
            variant="destructive"
            type="button"
            onClick={() =>
              boatId
                ? router.push(`/admin/boats/${boatId}`)
                : router.push("/admin/boats")
            }
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : boatId
                ? "Update Boat"
                : "Create Boat"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
