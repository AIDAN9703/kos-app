import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Anchor, Users, Ship } from "lucide-react";
import { boats, boatPricingTiers } from "@/database/schema";
import { formatCurrency } from "@/shared/lib/utils/general-utils";

interface AdminBoatDetailsProps {
  boat: typeof boats.$inferSelect & {
    pricingTiers?: (typeof boatPricingTiers.$inferSelect)[];
    ownerFirstName?: string | null;
    ownerLastName?: string | null;
    ownerEmail?: string | null;
  };
}

// Helper to format arrays to string
const formatArrayToString = (arr?: string[] | null) => {
  if (!arr || arr.length === 0) return "Not specified";
  return arr.join(", ");
};

export function AdminBoatDetails({ boat }: AdminBoatDetailsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - 2/3 width */}
      <div className="lg:col-span-2 space-y-6">
        {/* Specifications Card */}
        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
            <CardDescription>
              Technical details and specifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Anchor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Make</p>
                  <p className="text-sm text-muted-foreground">
                    {boat.make || "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Model</p>
                  <p className="text-sm text-muted-foreground">
                    {boat.model || "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Year Built</p>
                  <p className="text-sm text-muted-foreground">
                    {boat.yearBuilt || "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Length</p>
                  <p className="text-sm text-muted-foreground">
                    {boat.lengthFt ? `${boat.lengthFt} ft` : "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Capacity</p>
                  <p className="text-sm text-muted-foreground">
                    {boat.capacity
                      ? `${boat.capacity} people`
                      : "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Range</p>
                  <p className="text-sm text-muted-foreground">
                    {boat.range ? `${boat.range} nm` : "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>Boat description and details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Gallery */}
              {boat.galleryImages && boat.galleryImages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Gallery</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {boat.galleryImages
                      .slice(0, 8)
                      .map((image: string, i: number) => (
                        <div
                          key={i}
                          className="aspect-square bg-muted rounded-md overflow-hidden relative"
                        >
                          <Image
                            src={image}
                            alt={`${boat.name || "Boat"} image ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Description Text */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <p className="mt-2 text-sm text-foreground whitespace-pre-line">
                  {boat.description || "No description provided."}
                </p>
              </div>

              {/* Display Title */}
              {boat.displayTitle && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Display Title
                  </h3>
                  <p className="mt-2 text-sm">{boat.displayTitle}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>Features & Safety</CardTitle>
            <CardDescription>What the boat offers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Features</h3>
              <p className="mt-2 text-sm">
                {formatArrayToString(boat.features)}
              </p>
            </div>
            {boat.safetyEquipment && boat.safetyEquipment.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Safety Equipment
                </h3>
                <p className="mt-2 text-sm">
                  {formatArrayToString(boat.safetyEquipment)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Where the boat is located</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <p className="mt-2 text-sm">
                  {boat.locationLabel || "Not specified"}
                </p>
              </div>
            </div>
            {boat.dockInfo && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Dock Information
                </h3>
                <p className="mt-2 text-sm">{boat.dockInfo}</p>
              </div>
            )}
            {boat.parkingInfo && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Parking Information
                </h3>
                <p className="mt-2 text-sm">{boat.parkingInfo}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - 1/3 width */}
      <div className="space-y-6">
        {/* Owner Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Owner Information</CardTitle>
            <CardDescription>Boat owner details and notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Owner Name</h3>
              <p className="mt-1 text-sm font-medium">
                {boat.ownerFirstName && boat.ownerLastName
                  ? `${boat.ownerFirstName} ${boat.ownerLastName}`
                  : "No name available"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Owner Email</h3>
              <p className="mt-1 text-sm text-primary-strong">
                {boat.ownerEmail || "No email available"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Owner ID</h3>
              <p className="mt-1 text-xs font-mono bg-muted p-2 rounded border text-muted-foreground">
                {boat.ownerId}
              </p>
            </div>

            {boat.ownerNotes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Owner Notes
                </h3>
                <div className="mt-1 p-3 bg-warning-soft border border-warning/30 rounded-md">
                  <p className="text-sm text-warning whitespace-pre-line">
                    {boat.ownerNotes}
                  </p>
                </div>
              </div>
            )}

            {!boat.ownerNotes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Owner Notes
                </h3>
                <p className="mt-1 text-sm text-muted-foreground italic">
                  No owner notes available
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Link href={`/admin/boats/${boat.id}/edit`} className="w-full">
              <Button variant="outline" className="w-full">
                Edit Owner Notes
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Pricing Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Rental rates and fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pricing Tiers */}
            {boat.pricingTiers && boat.pricingTiers.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Pricing Tiers
                </h3>
                <div className="space-y-2 mt-2">
                  {boat.pricingTiers.map((tier, index) => (
                    <div
                      key={tier.id || index}
                      className="flex items-center justify-between bg-muted p-2 rounded"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {tier.name ||
                            `${tier.hours} hour${tier.hours !== 1 ? "s" : ""}`}
                          {tier.isDefault && (
                            <span className="ml-1 text-xs text-primary-strong">
                              (Default)
                            </span>
                          )}
                          {!tier.isActive && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (Inactive)
                            </span>
                          )}
                        </span>
                        {tier.description && (
                          <p className="text-xs text-muted-foreground">
                            {tier.description}
                          </p>
                        )}
                      </div>
                      <span className="font-medium">
                        {formatCurrency(tier.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {boat.weeklyRate && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Weekly Rate</span>
                <span className="font-medium">
                  {formatCurrency(boat.weeklyRate)}
                </span>
              </div>
            )}
            {boat.monthlyRate && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Monthly Rate</span>
                <span className="font-medium">
                  {formatCurrency(boat.monthlyRate)}
                </span>
              </div>
            )}
            {boat.cleaningFee && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Cleaning Fee</span>
                <span className="font-medium">
                  {formatCurrency(boat.cleaningFee)}
                </span>
              </div>
            )}
            {boat.depositAmount && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Security Deposit</span>
                <span className="font-medium">
                  {formatCurrency(boat.depositAmount)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Options Card */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Options</CardTitle>
            <CardDescription>Charter and booking settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Day Charter
                </h3>
                <p className="mt-2 text-sm">
                  {boat.dayCharter ? "Available" : "Not available"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Term Charter
                </h3>
                <p className="mt-2 text-sm">
                  {boat.termCharter ? "Available" : "Not available"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Instant Book
                </h3>
                <p className="mt-2 text-sm">
                  {boat.instantBook ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Crew Required
                </h3>
                <p className="mt-2 text-sm">
                  {boat.crewRequired ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Crew Included
                </h3>
                <p className="mt-2 text-sm">
                  {boat.crewIncluded ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Fuel Included
                </h3>
                <p className="mt-2 text-sm">
                  {boat.fuelIncluded ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentation Card */}
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Registration and insurance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Registration Number
              </h3>
              <p className="mt-2 text-sm">
                {boat.registrationNumber || "Not specified"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Hull ID</h3>
              <p className="mt-2 text-sm">{boat.hullId || "Not specified"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Insurance Info
              </h3>
              <p className="mt-2 text-sm">
                {boat.insuranceInfo || "Not specified"}
              </p>
            </div>
            {boat.insuranceExpiry && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Insurance Expiry
                </h3>
                <p className="mt-2 text-sm">
                  {new Date(boat.insuranceExpiry).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
