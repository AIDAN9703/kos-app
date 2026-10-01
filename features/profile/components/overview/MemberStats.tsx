import { Anchor, Clock, Ship, Users, type LucideIcon } from "lucide-react";
import type { TripStats } from "../../profile.types";
import { surface } from "../surface";

/** Four lifetime numbers from completed charters — the "on the water" résumé. */
export function MemberStats({ stats }: { stats: TripStats }) {
  const tiles: { label: string; value: number; Icon: LucideIcon }[] = [
    {
      label: stats.tripsCompleted === 1 ? "Trip completed" : "Trips completed",
      value: stats.tripsCompleted,
      Icon: Anchor,
    },
    { label: "Hours on the water", value: stats.hoursOnWater, Icon: Clock },
    { label: "Guests hosted", value: stats.guestsHosted, Icon: Users },
    {
      label: stats.boatsSailed === 1 ? "Boat sailed" : "Boats sailed",
      value: stats.boatsSailed,
      Icon: Ship,
    },
  ];

  return (
    <dl aria-label="Your charter history" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(({ label, value, Icon }) => (
        <div key={label} className={`flex flex-col-reverse p-4 sm:p-5 ${surface}`}>
          <dt className="mt-0.5 text-sm text-slate-500">{label}</dt>
          <dd className="text-2xl font-bold tabular-nums tracking-tight text-primary sm:text-3xl">
            <Icon className="mb-3 h-4 w-4 text-gold-deep" aria-hidden />
            {value.toLocaleString("en-US")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
