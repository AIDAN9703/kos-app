import type { PublicBoat } from "@/features/boats/boat.types";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/shared/lib/utils/general-utils";
import { Fact } from "./detail-ui";

interface BookingDetailsProps {
  boat: PublicBoat;
}

const DEFAULT_CANCELLATION = `Cancellations are handled case by case — we'll always work with you to find a solution (weather, safety concerns, and other unforeseen circumstances included).`;

export function BookingDetails({ boat }: BookingDetailsProps) {
  const currency = boat.currency ?? "USD";

  const facts: { label: string; value: string }[] = [];
  if (boat.minRentalHours) facts.push({ label: "Minimum rental", value: `${boat.minRentalHours} hours` });
  if (boat.advanceBookingDays) facts.push({ label: "Advance notice", value: `${boat.advanceBookingDays} days` });
  facts.push({
    label: "Security deposit",
    value: boat.depositAmount ? formatCurrency(boat.depositAmount, currency) : "Required",
  });
  facts.push({ label: "Payment methods", value: "Credit & debit card" });
  if (boat.cleaningFee) facts.push({ label: "Cleaning fee", value: formatCurrency(boat.cleaningFee, currency) });
  if (boat.minimumCharterDays) facts.push({ label: "Min. charter length", value: `${boat.minimumCharterDays} days` });
  facts.push({ label: "Confirmation", value: boat.instantBook ? "Instant" : "Owner approval required" });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        {facts.map((f) => (
          <Fact key={f.label} label={f.label} value={f.value} />
        ))}
      </div>

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Cancellation policy</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/70">
          {boat.cancellationPolicy || DEFAULT_CANCELLATION}
        </p>
        <Link
          href={`/bookings/${boat.id}/inquiry`}
          className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          <MessageCircle className="size-4" />
          Send a custom inquiry
        </Link>
      </div>
    </div>
  );
}
