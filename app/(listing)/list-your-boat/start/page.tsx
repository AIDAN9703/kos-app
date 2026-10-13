import { getSession } from "@/shared/lib/utils/auth-utils";
import { getBoatCatalog } from "@/features/boat-catalog/boat-catalog.data";
import { StepFrame } from "@/features/owner-listing/components/StepFrame";
import { basicsValuesFrom } from "@/features/owner-listing/basics-values";
import { StartListing } from "@/features/owner-listing/components/steps/StartListing";

/** Step one, open to everyone. Sign-up happens after it, inside the flow. */
export default async function StartListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params, catalog] = await Promise.all([
    getSession(),
    searchParams,
    getBoatCatalog(),
  ]);
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const initial = basicsValuesFrom({
    category: one("category"),
    make: one("make"),
    model: one("model"),
    yearBuilt: one("yearBuilt"),
    lengthFt: one("lengthFt"),
    capacity: one("capacity"),
  });

  return (
    <StepFrame draft={null} step="basics" start={initial}>
      <StartListing
        catalog={catalog}
        signedIn={Boolean(session)}
        resume={one("resume") === "1"}
        initial={initial}
      />
    </StepFrame>
  );
}
