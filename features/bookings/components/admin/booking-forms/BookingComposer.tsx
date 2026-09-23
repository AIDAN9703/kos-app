"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2 } from "lucide-react";

import { createBookingFull } from "@/features/bookings/actions/create-booking-full.actions";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { ToastAction } from "@/shared/components/ui/toast";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn, formatCurrency } from "@/shared/lib/utils/general-utils";
import { adminDisplayName, type AdminOption } from "@/shared/lib/utils/people-display";
import { UserSelect } from "@/features/users/components/UserSelect";
import { useUser } from "@/features/users/hooks/useUsers";

import { AddOnsFields } from "./shared/AddOnsFields";
import { BookingSectionFields } from "./shared/BookingSectionFields";
import { groupTiersByBoat } from "./shared/pricing";
import {
  createEmptyBookingSection,
  type BookingSectionData,
  type PricingTierOption,
} from "./types";
import type { BookingAddOnInput } from "@/features/bookings/booking.types";
import type { BookingExpenseCategory } from "@/database/types";
import type { DealPrefill } from "@/features/bookings/lib/deal-prefill";
import type { BookingDatePrefill } from "@/features/bookings/lib/booking-create-date-prefill";

type ExpenseRow = {
  key: string;
  category: BookingExpenseCategory;
  amount: string;
  label: string;
};

/**
 * One boat of the charter: trip fields, its own add-ons, and its own costs.
 * Every boat has a different owner and different expenses, so financials are
 * per-boat — never pooled onto the first boat.
 */
type ComposerSection = BookingSectionData & {
  key: string;
  addOns: BookingAddOnInput[];
  ownerPayout: string;
  expenses: ExpenseRow[];
};

const STEPS = ["Customer", "Charter", "Pricing & send"] as const;

const SOURCE_OPTIONS = ["Direct", "Broker", "Referral", "Website", "Boatsetter", "GetMyBoat"];

const OTHER_EXPENSE_CATEGORIES: { value: BookingExpenseCategory; label: string }[] = [
  { value: "CAPTAIN", label: "Captain" },
  { value: "FUEL", label: "Fuel" },
  { value: "DOCKAGE", label: "Dockage" },
  { value: "CREW", label: "Crew" },
  { value: "OTHER", label: "Other" },
];

const NO_AGENT = "__none__";

const dollarsToCents = (v: string) => Math.round((Number(v) || 0) * 100);

let seq = 0;
const nextKey = (prefix: string) => `${prefix}-${seq++}`;

/** Borderless brand pill — gold when active, soft fill when not. */
function ModePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-foreground/10 text-foreground hover:bg-foreground/15"
      )}
    >
      {children}
    </button>
  );
}

/**
 * THE booking/proposal creation flow — every door hosts this one component:
 * the create page (scratch or ?dealId upgrade), the deal page's "Create
 * proposal" modal, and the dashboard/board "Add booking" modal.
 *
 * A three-step wizard (Customer → Charter → Pricing & send) so admins are
 * never dumped a wall of fields. One or more boat sections ("+ Add another
 * boat") — more than one creates a charter party: one group, one proposal
 * link, one payment for every hull. GMV is DERIVED from the charter total
 * (base + cleaning + add-ons per boat) — never hand-typed.
 *
 * Customer identity: pricing an inquiry (dealPrefill) is guest-by-definition
 * — contact fields only. Scratch creates may link an existing account, whose
 * contact details are read from the account rather than copied into inputs.
 */
export function BookingComposer({
  pricingTiers,
  admins,
  dealPrefill = null,
  datePrefill = null,
  onSuccess,
}: {
  pricingTiers: PricingTierOption[];
  /** Sales-agent choices — the same admin list the board's assign menu uses. */
  admins: AdminOption[];
  /** Present when pricing an INQUIRY deal — that row upgrades in place. */
  dealPrefill?: DealPrefill | null;
  /** Calendar deep-link (?date=YYYY-MM-DD) prefill for scratch creates. */
  datePrefill?: BookingDatePrefill | null;
  /** Called after a successful create — lets a hosting modal close/refresh. */
  onSuccess?: (bookingId?: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const tiersByBoat = useMemo(() => groupTiersByBoat(pricingTiers), [pricingTiers]);
  const isDealMode = !!dealPrefill;

  // ── Customer ──
  const [customerMode, setCustomerMode] = useState<"guest" | "existing">("guest");
  const [selectedUserId, setSelectedUserId] = useState("");
  const { data: selectedUser } = useUser(
    customerMode === "existing" ? selectedUserId || "" : ""
  );
  const [customerName, setCustomerName] = useState(dealPrefill?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(dealPrefill?.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(dealPrefill?.customerPhone ?? "");
  const [numberOfPassengers, setNumberOfPassengers] = useState(
    dealPrefill?.numberOfPassengers ?? 6
  );
  const [adminNotes, setAdminNotes] = useState(dealPrefill?.adminNotes ?? "");

  // Contact used for every section: linked accounts are read, never copied —
  // no state syncing, no drift between the account and the form.
  const effectiveContact = useMemo(() => {
    if (customerMode === "existing" && selectedUser) {
      const fullName =
        `${selectedUser.firstName ?? ""} ${selectedUser.lastName ?? ""}`.trim() ||
        selectedUser.email;
      return {
        name: fullName,
        email: selectedUser.email,
        phone: selectedUser.phoneNumber ?? null,
        userId: selectedUser.id,
      };
    }
    return {
      name: customerName,
      email: customerEmail,
      phone: customerPhone || null,
      userId: null,
    };
  }, [customerMode, selectedUser, customerName, customerEmail, customerPhone]);

  // ── Boat sections ──
  const makeSection = useCallback((): ComposerSection => {
    const base = createEmptyBookingSection();
    return { ...base, key: nextKey("boat"), addOns: [], ownerPayout: "", expenses: [] };
  }, []);

  const [sections, setSections] = useState<ComposerSection[]>(() => {
    const first = makeSection();
    if (dealPrefill) {
      const boatTiers = dealPrefill.boatId
        ? pricingTiers.filter((t) => t.boatId === dealPrefill.boatId)
        : [];
      const defaultTier = boatTiers.find((t) => t.isDefault) ?? boatTiers[0] ?? null;
      return [
        {
          ...first,
          boatId: dealPrefill.boatId,
          usePricingTier: Boolean(defaultTier),
          pricingTierId: defaultTier?.id ?? "",
          basePrice: defaultTier?.price ?? 0,
          startDateTime: dealPrefill.startDateTime,
          endDateTime: dealPrefill.endDateTime,
        },
      ];
    }
    if (datePrefill) {
      return [
        { ...first, startDateTime: datePrefill.startDateTime, endDateTime: datePrefill.endDateTime },
      ];
    }
    return [first];
  });

  const updateSection = useCallback((key: string, updates: Partial<ComposerSection>) => {
    setSections((all) => all.map((s) => (s.key === key ? { ...s, ...updates } : s)));
  }, []);

  const addSection = useCallback(() => {
    setSections((all) => {
      const next = makeSection();
      const prev = all[all.length - 1];
      // New boats default to sailing alongside the previous one.
      return [
        ...all,
        { ...next, startDateTime: prev?.startDateTime ?? "", endDateTime: prev?.endDateTime ?? "" },
      ];
    });
  }, [makeSection]);

  const removeSection = useCallback((key: string) => {
    setSections((all) => (all.length > 1 ? all.filter((s) => s.key !== key) : all));
  }, []);

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");

  // ── Deal-level ops attribution (applies to every boat) ──
  const [source, setSource] = useState("Direct");
  const [agentAdminId, setAgentAdminId] = useState<string>(NO_AGENT);

  // Per-boat charter gross (base + cleaning + add-ons) — the same figure the
  // server derives from each booking's pricing row for its GMV.
  const grossBySection = useMemo(
    () =>
      sections.map((s) => {
        const tier = s.pricingTierId ? pricingTiers.find((t) => t.id === s.pricingTierId) : null;
        const basePrice = s.basePrice > 0 ? s.basePrice : (tier?.price ?? 0);
        const cleaningFee = s.boat?.cleaningFee ?? 0;
        const addOnsTotal = s.addOns.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
        return basePrice + cleaningFee + addOnsTotal;
      }),
    [sections, pricingTiers]
  );
  const charterTotal = grossBySection.reduce((a, b) => a + b, 0);

  const ownerPayoutTotal = useMemo(
    () => sections.reduce((sum, s) => sum + (Number(s.ownerPayout) || 0), 0),
    [sections]
  );
  const otherExpenseTotal = useMemo(
    () =>
      sections.reduce(
        (sum, s) => sum + s.expenses.reduce((a, r) => a + (Number(r.amount) || 0), 0),
        0
      ),
    [sections]
  );

  // Matches the board/dashboard formula: revenue = GMV − all expenses
  // (owner payouts and fuel/crew/dockage alike).
  const kosRevenue = charterTotal - ownerPayoutTotal - otherExpenseTotal;

  // ── Send options ──
  const [allowPayment, setAllowPayment] = useState(false);
  // Coming from a lead, the point is to SEND — default the channels on
  // (SMS only with consent) instead of silently saving it unsent.
  const [sendProposalEmail, setSendProposalEmail] = useState(
    Boolean(dealPrefill?.customerEmail)
  );
  const [sendProposalSms, setSendProposalSms] = useState(
    Boolean(dealPrefill?.smsConsent && dealPrefill.customerPhone)
  );

  // ── Step gating ──
  const customerValid =
    customerMode === "existing" && !isDealMode
      ? !!selectedUser
      : effectiveContact.name.trim() !== "" && /.+@.+\..+/.test(effectiveContact.email);
  const charterValid = sections.every(
    (s) =>
      !!s.boatId &&
      !!s.startDateTime &&
      (s.usePricingTier ? !!s.pricingTierId : s.basePrice > 0 && !!s.endDateTime)
  );
  const canContinue = step === 0 ? customerValid : step === 1 ? charterValid : true;

  const handleSubmit = useCallback(() => {
    setSubmitError(undefined);

    const sectionExpenseLines = (s: ComposerSection) => [
      ...((Number(s.ownerPayout) || 0) > 0
        ? [
            {
              category: "OWNER_PAYOUT" as BookingExpenseCategory,
              amountCents: dollarsToCents(s.ownerPayout),
              source: "MANUAL" as const,
            },
          ]
        : []),
      ...s.expenses
        .filter((r) => (Number(r.amount) || 0) > 0)
        .map((r) => ({
          category: r.category,
          amountCents: dollarsToCents(r.amount),
          label: r.label.trim() || null,
          source: "MANUAL" as const,
        })),
    ];

    const agentAdmin = admins.find((a) => a.id === agentAdminId);

    const payload = {
      dealId: dealPrefill?.dealId ?? null,
      bookings: sections.map((s) => ({
        boatId: s.boatId,
        usePricingTier: s.usePricingTier,
        pricingTierId: s.usePricingTier ? s.pricingTierId || null : null,
        basePrice: s.basePrice,
        depositAmount: s.depositAmount ?? null,
        customerName: effectiveContact.name,
        customerEmail: effectiveContact.email,
        customerPhone: effectiveContact.phone,
        userId: effectiveContact.userId,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime || null,
        addOns: s.addOns,
        expenseLines: sectionExpenseLines(s),
      })),
      numberOfPassengers,
      pickupLocation: pickupLocation || null,
      dropoffLocation: dropoffLocation || null,
      adminNotes: adminNotes || null,
      source: source || null,
      agentCode: agentAdmin ? adminDisplayName(agentAdmin) : null,
      allowPayment,
      sendProposalEmail,
      sendProposalSms,
    };

    startTransition(async () => {
      const result = await createBookingFull(payload);
      if (result.success && result.data) {
        const bookingId = result.data.bookingId;
        const isParty = sections.length > 1;
        const viewAction = (
          <ToastAction asChild altText="View booking">
            <Link href={`/admin/bookings/${bookingId}`}>View booking</Link>
          </ToastAction>
        );
        // The row is saved either way; only claim "sent" when it actually went.
        const failedChannels = [
          sendProposalEmail && result.data.emailSent === false ? "email" : null,
          sendProposalSms && result.data.smsSent === false ? "text" : null,
        ].filter((c): c is string => c !== null);
        if (failedChannels.length > 0) {
          toast({
            title: isDealMode
              ? "Proposal saved, but it didn't send"
              : "Booking created, but the proposal didn't send",
            description: `The ${failedChannels.join(" and ")} failed. Open the booking and use Resend.`,
            variant: "destructive",
            action: viewAction,
          });
        } else {
          toast({
            title: isDealMode ? "Proposal created." : "Booking created.",
            description: result.data.proposalSent
              ? `Proposal${isParty ? ` for ${sections.length} boats` : ""} sent to the customer.`
              : `Saved${isParty ? ` as a charter party (${sections.length} boats)` : ""} — not sent yet.`,
            variant: "success",
            action: viewAction,
          });
        }
        if (onSuccess) onSuccess(bookingId);
        else router.push(`/admin/bookings/${bookingId}`);
      } else {
        setSubmitError(result.error);
        toast({
          title: "Could not create booking",
          description: result.error ?? "Something went wrong.",
          variant: "destructive",
        });
      }
    });
  }, [
    admins,
    agentAdminId,
    dealPrefill?.dealId,
    isDealMode,
    sections,
    effectiveContact,
    numberOfPassengers,
    pickupLocation,
    dropoffLocation,
    adminNotes,
    source,
    allowPayment,
    sendProposalEmail,
    sendProposalSms,
    onSuccess,
    router,
    toast,
  ]);

  return (
    <div className="space-y-5">
      {/* ── Step indicator ── */}
      <div className="flex gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={cn("h-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            <span
              className={cn(
                "mt-1.5 block text-xs",
                i <= step ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Customer ── */}
      {step === 0 && (
        <div className="space-y-4">
          {!isDealMode && (
            <div className="flex gap-2">
              <ModePill active={customerMode === "guest"} onClick={() => setCustomerMode("guest")}>
                Guest
              </ModePill>
              <ModePill
                active={customerMode === "existing"}
                onClick={() => setCustomerMode("existing")}
              >
                Existing account
              </ModePill>
            </div>
          )}

          {customerMode === "existing" && !isDealMode ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Account</Label>
                <UserSelect value={selectedUserId} onChange={setSelectedUserId} />
              </div>
              {selectedUser ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{effectiveContact.name}</p>
                  <p className="text-muted-foreground">
                    {effectiveContact.email}
                    {effectiveContact.phone ? ` · ${effectiveContact.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Contact comes from the account. Booking will appear in their profile.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pick an account — the booking links to it and uses its contact details.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {/* ── Deal-level attribution ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sales agent</Label>
              <Select value={agentAdminId} onValueChange={setAgentAdminId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AGENT}>No agent</SelectItem>
                  {admins.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {adminDisplayName(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Visible to staff only"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Charter (one or more boats) ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Deal-level: one guest count for the whole charter (party or not). */}
          <div className="grid gap-4 md:grid-cols-[10rem_1fr]">
            <div className="space-y-2">
              <Label>Guests</Label>
              <Input
                type="number"
                min={1}
                value={numberOfPassengers}
                onChange={(e) => setNumberOfPassengers(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          {sections.map((section, index) => (
            <div
              key={section.key}
              className={cn(
                "space-y-5",
                sections.length > 1 && "rounded-xl border border-border/60 p-4"
              )}
            >
              {sections.length > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Boat {index + 1}
                    {section.boat?.name ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {section.boat.name}
                      </span>
                    ) : null}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSection(section.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              )}
              <BookingSectionFields
                section={section}
                onChange={(u) => updateSection(section.key, u)}
                pricingTiers={pricingTiers}
                tiersByBoat={tiersByBoat}
              />
              {index === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Marina / dock"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dropoff Location</Label>
                    <Input
                      value={dropoffLocation}
                      onChange={(e) => setDropoffLocation(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}
              <AddOnsFields
                lineItems={section.addOns}
                onChange={(addOns) => updateSection(section.key, { addOns })}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-xl border-dashed"
            onClick={addSection}
          >
            <Plus className="h-4 w-4" />
            Add another boat
          </Button>
        </div>
      )}

      {/* ── Step 3: Pricing & send ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* ── Per-boat money: each hull carries its own gross and costs ── */}
          <div className="space-y-3">
            {sections.map((section, index) => {
              const gross = grossBySection[index] ?? 0;
              const boatLabel =
                section.boat?.name ??
                (index === 0 ? (dealPrefill?.boatName ?? "Boat 1") : `Boat ${index + 1}`);
              return (
                <div
                  key={section.key}
                  className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">{boatLabel}</p>
                    <p className="text-sm tabular-nums">
                      <span className="mr-2 text-xs text-muted-foreground">Charter gross</span>
                      {formatCurrency(gross)}
                    </p>
                  </div>

                  <div className="max-w-[14rem] space-y-2">
                    <Label className="text-xs">Owner payout ($)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      min="0"
                      step="0.01"
                      value={section.ownerPayout}
                      onChange={(e) => updateSection(section.key, { ownerPayout: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Other expenses</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() =>
                          updateSection(section.key, {
                            expenses: [
                              ...section.expenses,
                              { key: nextKey("exp"), category: "FUEL", amount: "", label: "" },
                            ],
                          })
                        }
                      >
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    {section.expenses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Fuel, captain, dockage, crew — tracked against this boat.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {section.expenses.map((row) => (
                          <div key={row.key} className="flex items-center gap-2">
                            <Select
                              value={row.category}
                              onValueChange={(v) =>
                                updateSection(section.key, {
                                  expenses: section.expenses.map((r) =>
                                    r.key === row.key
                                      ? { ...r, category: v as BookingExpenseCategory }
                                      : r
                                  ),
                                })
                              }
                            >
                              <SelectTrigger className="h-9 w-32 shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OTHER_EXPENSE_CATEGORIES.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              className="h-9 flex-1"
                              placeholder="Label (optional)"
                              value={row.label}
                              onChange={(e) =>
                                updateSection(section.key, {
                                  expenses: section.expenses.map((r) =>
                                    r.key === row.key ? { ...r, label: e.target.value } : r
                                  ),
                                })
                              }
                            />
                            <Input
                              className="h-9 w-28"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="$0"
                              value={row.amount}
                              onChange={(e) =>
                                updateSection(section.key, {
                                  expenses: section.expenses.map((r) =>
                                    r.key === row.key ? { ...r, amount: e.target.value } : r
                                  ),
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-muted-foreground"
                              onClick={() =>
                                updateSection(section.key, {
                                  expenses: section.expenses.filter((r) => r.key !== row.key),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Rollup — mirrors the board: revenue = GMV − owner payout ── */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              {sections.length > 1 ? "Charter party summary" : "Invoice summary"}
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>Charter gross (GMV)</span>
                <span className="tabular-nums">{formatCurrency(charterTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Owner payouts</span>
                <span className="tabular-nums">({formatCurrency(ownerPayoutTotal)})</span>
              </div>
              {otherExpenseTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Other expenses</span>
                  <span className="tabular-nums">({formatCurrency(otherExpenseTotal)})</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>KOS revenue</span>
                <span
                  className={cn(
                    "tabular-nums",
                    kosRevenue >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatCurrency(kosRevenue)}
                </span>
              </div>
            </div>
          </div>

          {/* Send options */}
          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={sendProposalEmail}
                onCheckedChange={(c) => setSendProposalEmail(!!c)}
                className="mt-0.5"
              />
              <span>Email the proposal link to the customer</span>
            </label>
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={sendProposalSms}
                onCheckedChange={(c) => setSendProposalSms(!!c)}
                className="mt-0.5"
              />
              <span>Text the proposal link (SMS)</span>
            </label>
            {(sendProposalEmail || sendProposalSms) && (
              <div className="flex items-center gap-2.5 pl-7">
                <Checkbox
                  id="composer-allow-payment"
                  checked={allowPayment}
                  onCheckedChange={(c) => setAllowPayment(!!c)}
                />
                <Label htmlFor="composer-allow-payment" className="font-normal">
                  Allow payment now
                  <span className="ml-1 text-xs text-muted-foreground">
                    (guest can pay the deposit if one is set, or the full amount)
                  </span>
                </Label>
              </div>
            )}
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </div>
      )}

      {/* ── Wizard footer ── */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div>
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
        </div>
        {step < 2 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={pending} className="gap-2">
            <Send className="h-4 w-4" />
            {pending
              ? "Creating…"
              : sendProposalEmail || sendProposalSms
                ? "Create & send proposal"
                : isDealMode
                  ? "Save proposal"
                  : "Create booking"}
          </Button>
        )}
      </div>
    </div>
  );
}
