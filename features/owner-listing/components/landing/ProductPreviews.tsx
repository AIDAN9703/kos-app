import { Check, MapPin } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";

/**
 * Small, static pieces of the real owner screens that float over the photos
 * on /list-your-boat (Boatsetter's best trick: show the product before the
 * sign-up). Illustrative numbers only; nothing here is live data.
 */

const card =
  "rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(15,30,45,0.55)] ring-1 ring-black/5";

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm",
          on ? "left-[18px]" : "left-0.5"
        )}
      />
    </span>
  );
}

/** The "Trips and prices" step. */
export function PricingPreview({ className }: { className?: string }) {
  const rows = [
    { hours: 4, price: "$2,800", take: "$2,240", on: true },
    { hours: 6, price: "$3,600", take: "$2,880", on: true },
    { hours: 8, price: "$4,500", take: "$3,600", on: true },
  ];
  return (
    <div className={cn(card, "w-[300px] overflow-hidden", className)}>
      <div className="bg-primary px-4 py-3 text-sm font-semibold text-white">Trips and prices</div>
      <ul className="divide-y divide-gray-100">
        {rows.map((r) => (
          <li key={r.hours} className="flex items-center gap-3 px-4 py-3">
            <Toggle on={r.on} />
            <span className="text-sm font-semibold text-primary">{r.hours} hours</span>
            <span className="ml-auto text-right">
              <span className="block text-sm font-bold text-primary tabular-nums">{r.price}</span>
              <span className="block text-[11px] text-emerald-700 tabular-nums">
                You take home {r.take}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Where a listing stands, from submitted to live. */
export function ReviewPreview({ className }: { className?: string }) {
  const steps = [
    { label: "Submitted", detail: "Tue 9:41 AM", done: true },
    { label: "Reviewed by KOS", detail: "Photos and prices checked", done: true },
    { label: "Live on kosyachts.com", detail: "Guests can book", done: true, live: true },
  ];
  return (
    <div className={cn(card, "w-[290px] p-4", className)}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Your listing</p>
      <ol className="mt-3 space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                s.live ? "bg-emerald-600 text-white" : "bg-primary text-white"
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
            <span>
              <span
                className={cn(
                  "block text-sm font-semibold",
                  s.live ? "text-emerald-700" : "text-primary"
                )}
              >
                {s.label}
              </span>
              <span className="block text-xs text-slate-500">{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A booked charter, as the owner portal lists it. */
export function CharterPreview({ className }: { className?: string }) {
  return (
    <div className={cn(card, "w-[300px] p-4", className)}>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-emerald-700 uppercase">
          Confirmed
        </span>
        <span className="text-xs text-slate-500">Sat, Nov 14</span>
      </div>
      <p className="mt-2 text-[15px] font-semibold text-primary">4-hour sandbar charter</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
        <MapPin className="h-3 w-3" aria-hidden /> Miami Beach Marina · 11:00 AM
      </p>
      <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-slate-500">Your earnings</span>
        <span className="text-lg font-black text-emerald-700 tabular-nums">$2,240</span>
      </div>
    </div>
  );
}

/** A year of earnings in the owner portal. */
export function EarningsPreview({ className }: { className?: string }) {
  const bars = [30, 42, 55, 48, 70, 88, 64, 58, 76, 92, 60, 40];
  return (
    <div className={cn(card, "w-[260px] p-4", className)}>
      <p className="text-xs text-slate-500">Earned this year</p>
      <p className="text-2xl font-black text-primary tabular-nums">$41,600</p>
      <div className="mt-3 flex h-16 items-end gap-1">
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-sm", i === 9 ? "bg-gold-accent" : "bg-primary/80")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Gold dot grid that sits behind the floating cards. */
export function DotField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute bg-[radial-gradient(circle,rgba(178,163,122,0.55)_1.6px,transparent_1.7px)] bg-[length:16px_16px]",
        className
      )}
    />
  );
}
