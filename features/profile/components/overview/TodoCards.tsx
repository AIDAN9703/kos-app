import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { TRIP_TONE_CLASSES, tripDate, type TripTone } from "../../trip-presentation";
import type { AttentionItem } from "../../profile.types";
import { surfaceInteractive } from "../surface";

/**
 * Things waiting on the customer, as a row of small cards — a proposal to
 * answer, a payment, a gap in the account. Hidden when there's nothing to do.
 */
export function TodoCards({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="todo-heading">
      <h2 id="todo-heading" className="text-xl font-semibold tracking-tight text-primary">
        To do
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const card = describe(item);
          return (
            <li key={card.key}>
              <Link
                href={card.href}
                className={`group flex h-full flex-col p-5 ${surfaceInteractive}`}
              >
                <span
                  className={cn(
                    "self-start rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    TRIP_TONE_CLASSES[card.tone]
                  )}
                >
                  {card.chip}
                </span>
                <p className="mt-3 font-semibold leading-snug text-primary">{card.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{card.detail}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary">
                  {card.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function describe(item: AttentionItem): {
  key: string;
  chip: string;
  tone: TripTone;
  title: string;
  detail: string;
  cta: string;
  href: string;
} {
  switch (item.kind) {
    case "proposal":
      return {
        key: `proposal-${item.trip.id}`,
        chip: "Proposal ready",
        tone: "accent",
        title: item.trip.boatName,
        detail: `${tripDate(item.trip)} · Review the details and accept when you're ready.`,
        cta: "Review proposal",
        href: `/bookings/proposal/${item.trip.publicToken}`,
      };
    case "balance":
      return {
        key: `balance-${item.trip.id}`,
        chip: item.trip.paidCents > 0 ? "Balance due" : "Payment due",
        tone: "warning",
        title: `${formatCentsAsCurrency(item.trip.balanceCents)} · ${item.trip.boatName}`,
        detail:
          item.trip.paidCents > 0
            ? `${tripDate(item.trip)} · Deposit received. The balance is due before departure.`
            : `${tripDate(item.trip)} · Pay to lock in your date.`,
        cta: "View trip",
        href: `/profile/bookings/${item.trip.id}`,
      };
    case "phone":
      return {
        key: "phone",
        chip: "Your account",
        tone: "neutral",
        title: "Add a phone number",
        detail: "Your captain and our team use it for day-of updates.",
        cta: "Add phone",
        href: "/profile/settings#personal",
      };
    case "photo":
      return {
        key: "photo",
        chip: "Your account",
        tone: "neutral",
        title: "Add a profile photo",
        detail: "Helps the crew recognise you at the dock.",
        cta: "Add photo",
        href: "/profile/settings#photo",
      };
  }
}
