"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { DateTimePicker } from "@/shared/components/ui/date-time-picker";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn, formatCurrency } from "@/shared/lib/utils/general-utils";
import {
  centsToDollars,
  dollarsToCents,
  formatCentsAsCurrency,
} from "@/shared/lib/utils/money-utils";
import { BoatSelect } from "@/features/boats/components/BoatSelect";
import { boatsApi } from "@/features/boats/boat.api";
import type { BoatForAdminSelect } from "@/features/boats/boat.types";
import type { BookingAddOn, BookingAddOnInput } from "@/features/bookings/booking.types";
import type { CustomerMoney } from "@/features/bookings/lib/booking-money";
import {
  addBoatToCharterParty,
  shiftCharterPartyWindows,
  updateBookingPricing,
  updateBookingSingleField,
} from "@/features/bookings/actions/deal.actions";
import { AddOnsFields } from "@/features/bookings/components/admin/booking-forms/shared/AddOnsFields";
import { formatServiceFee, serviceFeeOn } from "@/shared/lib/utils/pricing-utils";
import { reanchorWallTime } from "@/features/bookings/components/admin/booking-forms/shared/BookingSectionFields";
import { useBookingEditMode } from "./BookingEditMode";

/** One pricing option of a boat, as the editor needs it. */
interface TierOption {
  id: string;
  hours: number;
  price: number;
  name: string | null;
  isDefault: boolean | null;
}

interface TripEditorTrip {
  numberOfPassengers: number | null;
  needsCaptain: boolean | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  /** ISO strings */
  startDateTime: string | null;
  endDateTime: string | null;
  boatTimezone: string | null;
  boatId: string | null;
  selectedBoat: Omit<BoatForAdminSelect, "timezone"> | null;
}

export interface TripEditorPricing {
  /** False once the deal is settled — pricing is history then. */
  editable: boolean;
  currency: string;
  money: CustomerMoney;
  basePriceCents: number;
  captainFeeCents: number;
  cleaningFeeCents: number;
  addOns: BookingAddOn[];
  pricingTierId: string | null;
  /** The current boat's active tiers. */
  tiers: TierOption[];
}

interface NewBoat {
  key: string;
  boatId: string;
  boat: BoatForAdminSelect | null;
  tiers: TierOption[];
  tierId: string;
  loading: boolean;
}

const CUSTOM = "__custom__";
let seq = 0;
const nextKey = () => `boat-${seq++}`;

/** "1250" / "$1,250.50" → cents; empty → 0; garbage → NaN. */
function parseDollars(raw: string): number {
  const t = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? dollarsToCents(n) : NaN;
}

function toInput(cents: number | null | undefined): string {
  return cents ? String(centsToDollars(cents)) : "";
}

function sameInstant(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b;
  return new Date(a).getTime() === new Date(b).getTime();
}

function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

async function fetchActiveTiers(boatId: string): Promise<TierOption[]> {
  try {
    return await boatsApi.getBoatPricingTiers(boatId);
  } catch {
    return [];
  }
}

const defaultTier = (tiers: TierOption[]) => tiers.find((t) => t.isDefault) ?? tiers[0];

/**
 * Edit trip, laid out like the new-booking form: boat and time, guests and
 * logistics, pricing, add-ons, the live total, then "Add boat". Everything
 * the admin changes lives here on the left; Finances on the right stays a
 * read-only breakdown. One saver runs on "Done", in a fixed order: boat swap
 * (the server reprices) → trip fields → pricing (the admin's numbers win) →
 * party shift → new boats.
 */
export function TripEditor({
  bookingId,
  trip,
  pricing,
  partySize,
  canAddBoat,
}: {
  bookingId: string;
  trip: TripEditorTrip;
  pricing: TripEditorPricing | null;
  partySize: number;
  canAddBoat: boolean;
}) {
  const { registerSaver } = useBookingEditMode();
  const router = useRouter();
  const { toast } = useToast();

  // ── Trip ──
  const [boatId, setBoatId] = useState(trip.boatId ?? "");
  const [boat, setBoat] = useState<BoatForAdminSelect | null>(
    trip.selectedBoat ? { ...trip.selectedBoat, timezone: trip.boatTimezone } : null
  );
  const tz = boat?.timezone ?? trip.boatTimezone;
  const [start, setStart] = useState(trip.startDateTime ?? "");
  const [end, setEnd] = useState(trip.endDateTime ?? "");
  const [moveParty, setMoveParty] = useState(true);
  const [passengers, setPassengers] = useState(trip.numberOfPassengers ?? 1);
  const [needsCaptain, setNeedsCaptain] = useState(Boolean(trip.needsCaptain));
  const [pickup, setPickup] = useState(trip.pickupLocation ?? "");
  const [dropoff, setDropoff] = useState(trip.dropoffLocation ?? "");

  // ── Pricing ──
  const [tiers, setTiers] = useState<TierOption[]>(pricing?.tiers ?? []);
  const [tierId, setTierId] = useState(pricing?.pricingTierId ?? CUSTOM);
  const [base, setBase] = useState(toInput(pricing?.basePriceCents));
  const [captainFee, setCaptainFee] = useState(toInput(pricing?.captainFeeCents));
  const [cleaningFee, setCleaningFee] = useState(toInput(pricing?.cleaningFeeCents));
  const [deposit, setDeposit] = useState(toInput(pricing?.money.depositCents));
  const [addOns, setAddOns] = useState<BookingAddOnInput[]>(() =>
    (pricing?.addOns ?? []).map((a) => ({
      name: a.name,
      description: a.description ?? "",
      unitPrice: a.unitPrice,
      quantity: a.quantity,
    }))
  );

  // ── New boats for the party ──
  const [newBoats, setNewBoats] = useState<NewBoat[]>([]);

  const money = pricing?.money;
  const fmt = (c: number) => formatCentsAsCurrency(c, { currency: pricing?.currency ?? "USD" });
  // Re-pricing keeps the fee this booking was quoted with (its snapshot).
  const fee = money?.serviceFee ?? { bps: 0, fixedCents: 0 };
  const draft = {
    baseCents: parseDollars(base),
    captainCents: parseDollars(captainFee),
    cleaningCents: parseDollars(cleaningFee),
    depositCents: deposit.trim() === "" ? null : parseDollars(deposit),
    addOnsCents: Math.round(addOns.reduce((s, a) => s + a.unitPrice * a.quantity, 0) * 100),
  };
  const draftValid = [
    draft.baseCents,
    draft.captainCents,
    draft.cleaningCents,
    draft.depositCents ?? 0,
  ].every(Number.isFinite);
  const draftSubtotal =
    draft.baseCents + draft.captainCents + draft.cleaningCents + draft.addOnsCents;
  const draftFee = serviceFeeOn(draftSubtotal, fee);
  const draftTotal = money?.serviceFeeWaived ? draftSubtotal : draftSubtotal + draftFee;

  function pickTier(id: string, list: TierOption[] = tiers) {
    setTierId(id);
    const tier = list.find((t) => t.id === id);
    if (!tier) return;
    setBase(String(tier.price));
    // A tier is a duration — the end follows the start, like the new-booking form.
    if (start) setEnd(addHours(start, tier.hours));
  }

  async function changeBoat(id: string, next: BoatForAdminSelect | null) {
    if (!id || id === boatId) return;
    // Dates already set keep their wall time under the new boat's zone.
    const nextTz = next?.timezone ?? null;
    if (start) setStart(reanchorWallTime(start, tz, nextTz));
    if (end) setEnd(reanchorWallTime(end, tz, nextTz));
    setBoatId(id);
    setBoat(next);
    if (next?.cleaningFee != null) setCleaningFee(next.cleaningFee ? String(next.cleaningFee) : "");
    const list = await fetchActiveTiers(id);
    setTiers(list);
    const preferred = defaultTier(list);
    if (preferred) {
      setTierId(preferred.id);
      setBase(String(preferred.price));
    } else {
      setTierId(CUSTOM);
    }
  }

  async function changeNewBoat(key: string, id: string, next: BoatForAdminSelect | null) {
    setNewBoats((rows) =>
      rows.map((r) => (r.key === key ? { ...r, boatId: id, boat: next, loading: true } : r))
    );
    const list = await fetchActiveTiers(id);
    setNewBoats((rows) =>
      rows.map((r) =>
        r.key === key
          ? { ...r, tiers: list, tierId: defaultTier(list)?.id ?? "", loading: false }
          : r
      )
    );
  }

  async function handleSave(): Promise<{ ok: boolean }> {
    const fail = (title: string, description?: string) => {
      toast({ title, description, variant: "destructive" });
      return { ok: false };
    };

    // ── Validate before writing anything ──
    if (!start) return fail("Pick a start date and time");
    if (end && new Date(end) <= new Date(start)) return fail("The end has to be after the start");
    if (pricing?.editable && !draftValid) {
      return fail("Check the pricing amounts", "One of the dollar fields isn't a number.");
    }
    const incomplete = newBoats.find((b) => !b.boatId || !b.tierId);
    if (incomplete) {
      return fail("Finish the new boat", "Pick a boat and a pricing option, or remove it.");
    }

    let changed = false;

    // 1–2. Trip fields. Boat first: swapping reprices the booking, and the
    // window then availability-checks against the NEW boat's calendar.
    const boatChanged = Boolean(boatId) && boatId !== (trip.boatId ?? "");
    const startChanged = !sameInstant(start, trip.startDateTime);
    const endChanged = !sameInstant(end || null, trip.endDateTime);
    const updates: Array<{ field: string; value: unknown }> = [];
    if (boatChanged) updates.push({ field: "boatId", value: boatId });
    if (startChanged || endChanged) {
      // One atomic window — separate start/end writes let the DB see
      // end-before-start mid-save.
      updates.push({
        field: "tripWindow",
        value: { startDateTime: start, endDateTime: end || null },
      });
    }
    if (passengers !== trip.numberOfPassengers) {
      updates.push({ field: "numberOfPassengers", value: passengers });
    }
    if (needsCaptain !== Boolean(trip.needsCaptain)) {
      updates.push({ field: "needsCaptain", value: needsCaptain });
    }
    if (pickup !== (trip.pickupLocation ?? "")) {
      updates.push({ field: "pickupLocation", value: pickup.trim() || null });
    }
    if (dropoff !== (trip.dropoffLocation ?? "")) {
      updates.push({ field: "dropoffLocation", value: dropoff.trim() || null });
    }
    for (const update of updates) {
      const res = await updateBookingSingleField(bookingId, update);
      if (!res.success) {
        router.refresh();
        return fail("Couldn't save the trip", res.error);
      }
      changed = true;
    }

    // 3. Pricing. After a boat swap the server has repriced, so the admin's
    // numbers are always re-applied then.
    if (pricing?.editable) {
      const unchanged =
        !boatChanged &&
        (tierId === CUSTOM ? null : tierId) === pricing.pricingTierId &&
        draft.baseCents === pricing.basePriceCents &&
        draft.captainCents === pricing.captainFeeCents &&
        draft.cleaningCents === pricing.cleaningFeeCents &&
        (draft.depositCents ?? 0) === (pricing.money.depositCents ?? 0) &&
        JSON.stringify(addOns.map((a) => [a.name.trim(), a.unitPrice, a.quantity])) ===
          JSON.stringify(pricing.addOns.map((a) => [a.name.trim(), a.unitPrice, a.quantity]));
      if (!unchanged) {
        const res = await updateBookingPricing(bookingId, {
          pricingTierId: tierId === CUSTOM ? null : tierId,
          basePriceCents: draft.baseCents,
          captainFeeCents: draft.captainCents,
          cleaningFeeCents: draft.cleaningCents,
          depositAmountCents:
            draft.depositCents && draft.depositCents > 0 ? draft.depositCents : null,
          addOns: addOns
            .filter((a) => a.name.trim())
            .map((a) => ({
              name: a.name.trim(),
              description: a.description?.trim() || null,
              unitPrice: a.unitPrice,
              quantity: a.quantity,
            })),
        });
        if (!res.success) {
          router.refresh();
          return fail("Couldn't save pricing", res.error);
        }
        changed = true;
      }
    }

    // 4. Charter party: the same start/end deltas move the sibling boats, so
    // a 4-boat change is one edit, not four.
    if ((startChanged || endChanged) && moveParty && partySize > 1) {
      const delta = (oldIso: string | null, nextIso: string | null) =>
        oldIso && nextIso ? new Date(nextIso).getTime() - new Date(oldIso).getTime() : 0;
      const shifted = await shiftCharterPartyWindows(
        bookingId,
        startChanged ? delta(trip.startDateTime, start) : 0,
        endChanged ? delta(trip.endDateTime, end || null) : 0
      );
      if (!shifted.success) {
        router.refresh();
        return fail("The other boats didn't fully move", shifted.error);
      }
    }

    // 5. New boats join the party with this trip's window and customer.
    for (const row of newBoats) {
      const res = await addBoatToCharterParty(bookingId, {
        boatId: row.boatId,
        pricingTierId: row.tierId,
      });
      if (!res.success) {
        router.refresh();
        return fail(`Couldn't add ${row.boat?.name ?? "the boat"}`, res.error);
      }
      changed = true;
    }

    if (changed) {
      toast({ title: newBoats.length > 0 ? "Trip saved and boat added" : "Trip saved" });
      router.refresh();
    }
    return { ok: true };
  }

  // "Done" calls the latest save through a ref — closures in a registry go stale.
  const saveRef = useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
  });
  useEffect(() => registerSaver("trip", () => saveRef.current()), [registerSaver]);

  const selectedTier = tierId !== CUSTOM ? tiers.find((t) => t.id === tierId) : undefined;

  return (
    <div className="space-y-6">
      {/* ── Boat & time ── */}
      <FormSection title="Boat & time">
        <div className="space-y-1.5">
          <Label>Boat</Label>
          <BoatSelect
            value={boatId}
            selectedBoat={boat}
            onChange={(id, next) => void changeBoat(id, next)}
            showClearButton={false}
            placeholder="Pick a boat"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Start <span className="font-normal text-muted-foreground">boat local time</span>
            </Label>
            <DateTimePicker
              value={start}
              onChange={(v) => {
                setStart(v);
                if (selectedTier) setEnd(addHours(v, selectedTier.hours));
              }}
              timeZone={tz}
              placeholder="Select start"
            />
          </div>
          <div className="space-y-1.5">
            <Label>End</Label>
            <DateTimePicker value={end} onChange={setEnd} timeZone={tz} placeholder="Select end" />
          </div>
        </div>
        {partySize > 1 ? (
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={moveParty} onCheckedChange={setMoveParty} />
            Move the other boats in this party by the same amount
          </label>
        ) : null}
      </FormSection>

      {/* ── Guests & logistics ── */}
      <FormSection title="Guests & logistics">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Passengers</Label>
            <Input
              type="number"
              min={1}
              value={passengers}
              onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <label className="flex items-center gap-3 self-end pb-2 text-sm">
            <Switch checked={needsCaptain} onCheckedChange={setNeedsCaptain} />
            Captain needed
          </label>
          <div className="space-y-1.5">
            <Label>Pickup location</Label>
            <Input
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="Marina / dock"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Drop-off location</Label>
            <Input
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      </FormSection>

      {/* ── Pricing + add-ons ── */}
      {pricing?.editable && money ? (
        <>
          <FormSection title="Pricing">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Pricing tier</Label>
                <Select value={tierId} onValueChange={(v) => pickTier(v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="admin-theme">
                    <SelectItem value={CUSTOM}>Custom price</SelectItem>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name || `${t.hours} hrs`} · {formatCurrency(t.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DollarField
                label="Charter price"
                value={base}
                onChange={(v) => {
                  setBase(v);
                  setTierId(CUSTOM);
                }}
              />
              <DollarField label="Captain fee" value={captainFee} onChange={setCaptainFee} />
              <DollarField label="Cleaning fee" value={cleaningFee} onChange={setCleaningFee} />
              <DollarField
                label="Deposit"
                value={deposit}
                onChange={setDeposit}
                hint="Before the card fee, which is added when the guest pays it. Leave blank and the guest pays in full."
              />
            </div>
          </FormSection>

          <FormSection>
            <AddOnsFields lineItems={addOns} onChange={setAddOns} />
          </FormSection>

          <dl className="space-y-1.5 rounded-xl bg-secondary/40 p-4 text-sm">
            <SummaryRow label="Subtotal" value={draftValid ? fmt(draftSubtotal) : "—"} />
            <SummaryRow
              label={
                money.serviceFeeWaived
                  ? "Card fee · waived"
                  : `Card fee (${formatServiceFee(fee)})`
              }
              value={draftValid ? fmt(draftFee) : "—"}
              muted
              strike={money.serviceFeeWaived}
            />
            <SummaryRow label="New total" value={draftValid ? fmt(draftTotal) : "—"} strong />
            {money.paidCents > 0 ? (
              <SummaryRow
                label="Balance after what's paid"
                value={draftValid ? fmt(Math.max(0, draftTotal - money.paidCents)) : "—"}
                muted
              />
            ) : null}
          </dl>
        </>
      ) : pricing ? (
        <p className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
          Pricing is locked once a trip is completed or cancelled.
        </p>
      ) : null}

      {/* ── More boats ── */}
      {canAddBoat ? (
        <div className="space-y-3">
          {newBoats.map((row, i) => (
            <div key={row.key} className="space-y-4 rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  New boat{newBoats.length > 1 ? ` ${i + 1}` : ""}
                  <span className="ml-2 font-normal text-muted-foreground">
                    same trip and customer
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove this boat"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setNewBoats((rows) => rows.filter((r) => r.key !== row.key))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label>Boat</Label>
                <BoatSelect
                  value={row.boatId}
                  selectedBoat={row.boat}
                  onChange={(id, next) => void changeNewBoat(row.key, id, next)}
                  showClearButton={false}
                  placeholder="Pick a boat"
                />
              </div>
              {row.boatId ? (
                <div className="space-y-1.5">
                  <Label>Pricing option</Label>
                  {row.loading ? (
                    <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading options…
                    </p>
                  ) : row.tiers.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">
                      This boat has no active pricing options.
                    </p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {row.tiers.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setNewBoats((rows) =>
                              rows.map((r) => (r.key === row.key ? { ...r, tierId: t.id } : r))
                            )
                          }
                          className={cn(
                            "flex items-baseline justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                            row.tierId === t.id
                              ? "bg-primary-soft text-primary-strong ring-1 ring-primary/50"
                              : "bg-secondary/40 hover:bg-secondary/70"
                          )}
                        >
                          <span className="font-medium">{t.name || `${t.hours} hours`}</span>
                          <span className="tabular-nums">{formatCurrency(t.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full gap-2 rounded-xl border-dashed text-sm font-semibold"
            onClick={() =>
              setNewBoats((rows) => [
                ...rows,
                { key: nextKey(), boatId: "", boat: null, tiers: [], tierId: "", loading: false },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add boat
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FormSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border/50 pt-5">
      {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
      {children}
    </section>
  );
}

function DollarField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
          $
        </span>
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="h-10 pl-7"
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  strong,
  strike,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  strike?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={cn(
          muted ? "text-muted-foreground" : "text-foreground",
          strong && "font-semibold"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums",
          muted && "text-muted-foreground",
          strong && "font-semibold",
          strike && "line-through opacity-60"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
