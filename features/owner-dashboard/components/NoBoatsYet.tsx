import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { surface } from "@/features/profile/components/surface";

/** Owner account with no boats in the fleet yet. */
export function NoBoatsYet() {
  return (
    <div className={`px-6 py-12 text-center ${surface}`}>
      <h2 className="text-xl font-semibold text-primary">No boats yet</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-7 text-slate-600">
        Once the KOS team adds your boat to the fleet, its charters, calendar and payouts show up
        here.
      </p>
      <Button asChild className="mt-6 rounded-full px-6">
        <Link href="/services/charter-management">How charter management works</Link>
      </Button>
    </div>
  );
}
