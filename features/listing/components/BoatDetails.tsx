import { Info, Sparkles, Navigation, Ship, ClipboardCheck, BadgeInfo } from "lucide-react";
import type { PublicBoat } from "@/features/boats/boat.types";
import { BasicInfo } from "./sub-components/BasicInfo";
import { Description } from "./sub-components/Description";
import { BoatSpecs } from "./sub-components/BoatSpecs";
import { BookingDetails } from "./sub-components/BookingDetails";
import { FeaturesAmenities } from "./sub-components/FeaturesAmenities";
import { Destinations } from "./sub-components/Destinations";
import { GoodToKnow } from "./sub-components/GoodToKnow";
import { Section } from "./sub-components/detail-ui";

interface BoatDetailsProps {
  boat: PublicBoat;
}

export default function BoatDetails({ boat }: BoatDetailsProps) {
  const hasFeatures =
    (boat.features?.length || 0) > 0 || (boat.safetyEquipment?.length || 0) > 0;
  const hasDestinations = (boat.availableDestinations?.length || 0) > 0;
  const hasSpecs = !!(
    boat.make ||
    boat.model ||
    boat.yearBuilt ||
    boat.lengthFt ||
    boat.capacity ||
    boat.sleeps ||
    boat.bathrooms ||
    boat.showers ||
    boat.range
  );
  const hasGoodToKnow = !!(
    boat.rules?.trim() ||
    boat.specialInstructions?.trim() ||
    boat.dockInfo?.trim() ||
    boat.parkingInfo?.trim()
  );

  const sections = [
    <Section key="about" title="About this charter" icon={<Info className="size-4" />}>
      <Description boat={boat} />
    </Section>,
    hasFeatures && (
      <Section key="offers" title="What this charter offers" icon={<Sparkles className="size-4" />}>
        <FeaturesAmenities boat={boat} />
      </Section>
    ),
    hasDestinations && (
      <Section key="destinations" title="Where you can cruise" icon={<Navigation className="size-4" />}>
        <Destinations boat={boat} />
      </Section>
    ),
    hasSpecs && (
      <Section key="specs" title="Vessel specifications" icon={<Ship className="size-4" />}>
        <BoatSpecs boat={boat} />
      </Section>
    ),
    <Section key="booking" title="Booking information" icon={<ClipboardCheck className="size-4" />}>
      <BookingDetails boat={boat} />
    </Section>,
    hasGoodToKnow && (
      <Section key="good-to-know" title="Good to know" icon={<BadgeInfo className="size-4" />}>
        <GoodToKnow boat={boat} />
      </Section>
    ),
  ].filter(Boolean);

  return (
    <article>
      <BasicInfo boat={boat} />
      <div className="mt-6 divide-y divide-border">
        {sections.map((node, i) => (
          <div key={i} className="py-6 first:pt-0">
            {node}
          </div>
        ))}
      </div>
    </article>
  );
}
