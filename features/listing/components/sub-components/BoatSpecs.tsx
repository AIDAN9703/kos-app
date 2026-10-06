import type { PublicBoat } from "@/features/boats/boat.types";
import { Fact } from "./detail-ui";

interface BoatSpecsProps {
  boat: PublicBoat;
}

export function BoatSpecs({ boat }: BoatSpecsProps) {
  const specs: { label: string; value?: string | number | null }[] = [
    { label: "Make", value: boat.make },
    { label: "Model", value: boat.model },
    { label: "Year built", value: boat.yearBuilt },
    { label: "Length", value: boat.lengthFt ? `${boat.lengthFt} ft` : null },
    { label: "Capacity", value: boat.capacity ? `${boat.capacity} guests` : null },
    { label: "Sleeps", value: boat.sleeps ? `${boat.sleeps} guests` : null },
    { label: "Bathrooms", value: boat.bathrooms },
    { label: "Showers", value: boat.showers },
    { label: "Cruising range", value: boat.range ? `${boat.range} nm` : null },
  ].filter((s) => s.value !== null && s.value !== undefined && s.value !== "");

  if (specs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
      {specs.map((s) => (
        <Fact key={s.label} label={s.label} value={s.value} />
      ))}
    </div>
  );
}
