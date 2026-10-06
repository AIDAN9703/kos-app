import type { PublicBoat } from "@/features/boats/boat.types";

interface GoodToKnowProps {
  boat: PublicBoat;
}

export function GoodToKnow({ boat }: GoodToKnowProps) {
  const blocks: { title: string; body?: string | null }[] = [
    { title: "House rules", body: boat.rules },
    { title: "Special instructions", body: boat.specialInstructions },
    { title: "Departure & dock", body: boat.dockInfo },
    { title: "Parking", body: boat.parkingInfo },
  ].filter((b) => b.body && b.body.trim());

  if (blocks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
      {blocks.map((b) => (
        <div key={b.title}>
          <h3 className="mb-1 text-sm font-semibold text-foreground">{b.title}</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/70">{b.body}</p>
        </div>
      ))}
    </div>
  );
}
