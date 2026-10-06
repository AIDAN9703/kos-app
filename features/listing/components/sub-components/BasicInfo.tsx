import {
  MapPin,
  Users,
  Ruler,
  Bed,
  CalendarDays,
  Anchor,
  Zap,
  ShieldCheck,
  Fuel,
} from "lucide-react";
import { Boat } from "@/shared/lib/types/types";
import { Pill } from "./detail-ui";

interface BasicInfoProps {
  boat: Boat;
}

export function BasicInfo({ boat }: BasicInfoProps) {
  const facts: { icon: React.ReactNode; text: string }[] = [];
  if (boat.locationLabel)
    facts.push({ icon: <MapPin className="size-4 text-primary" />, text: boat.locationLabel });
  if (boat.capacity)
    facts.push({ icon: <Users className="size-4 text-primary" />, text: `Up to ${boat.capacity} guests` });
  if (boat.lengthFt)
    facts.push({ icon: <Ruler className="size-4 text-primary" />, text: `${boat.lengthFt} ft` });
  if (boat.sleeps)
    facts.push({ icon: <Bed className="size-4 text-primary" />, text: `Sleeps ${boat.sleeps}` });
  if (boat.yearBuilt)
    facts.push({ icon: <CalendarDays className="size-4 text-primary" />, text: `${boat.yearBuilt}` });

  return (
    <header className="space-y-3">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
        {boat.displayTitle || boat.name}
      </h1>

      {/* Compact inline facts */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground/80">
        {facts.map((f, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {f.icon}
            <span className="font-medium">{f.text}</span>
          </span>
        ))}
      </div>

      {/* Highlight pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {boat.instantBook ? (
          <Pill icon={<Zap className="size-3.5" />} accent>
            Instant Book
          </Pill>
        ) : (
          <Pill>Request to book</Pill>
        )}
        {(boat.crewIncluded || boat.crewRequired) && (
          <Pill icon={<Anchor className="size-3.5" />}>Captain &amp; crew included</Pill>
        )}
        {boat.fuelIncluded && <Pill icon={<Fuel className="size-3.5" />}>Fuel included</Pill>}
        {boat.dayCharter && <Pill>Day charters</Pill>}
        {boat.termCharter && <Pill>Multi-day charters</Pill>}
        {boat.safetyEquipment && boat.safetyEquipment.length > 0 && (
          <Pill icon={<ShieldCheck className="size-3.5" />}>Safety equipped</Pill>
        )}
      </div>
    </header>
  );
}
