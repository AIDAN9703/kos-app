import Link from "next/link";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsAsWholeDollars } from "@/shared/lib/utils/money-utils";
import { surface } from "@/features/profile/components/surface";
import type { BoatPerformance } from "../owner.types";

/** This year's numbers per boat. */
export function FleetTable({ rows }: { rows: BoatPerformance[] }) {
  return (
    <div className={`overflow-x-auto ${surface}`}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-slate-500">
            <th scope="col" className="px-5 py-3 font-medium">
              Boat
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Charters
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Hours
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Your payout
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Next charter
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-slate-700 tabular-nums">
          {rows.map((row) => (
            <tr key={row.boatId} className="transition-colors hover:bg-slate-50">
              <th scope="row" className="px-5 py-3.5 font-semibold">
                <Link href={`/owner/boats/${row.boatId}`} className="text-primary hover:underline">
                  {row.boatName}
                </Link>
              </th>
              <td className="px-3 py-3.5 text-right">{row.charters}</td>
              <td className="px-3 py-3.5 text-right">{row.hours}</td>
              <td className="px-3 py-3.5 text-right">
                {row.earningsCents > 0 ? formatCentsAsWholeDollars(row.earningsCents) : "—"}
              </td>
              <td className="px-5 py-3.5 text-right">
                {row.nextCharter
                  ? formatBoatLocal(row.nextCharter.startsAt, row.nextCharter.timezone, "MMM d")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
