"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, type LucideIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { cn } from "@/shared/lib/utils/general-utils";
import { updateAppSettings } from "@/features/app-settings/app-settings.mutations";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import { serviceFeeOn } from "@/shared/lib/utils/pricing-utils";
import type { AppSettings } from "@/features/app-settings/app-settings.types";

type SectionId = "payments" | "theme";

const SECTIONS: { id: SectionId; label: string; description: string; icon: LucideIcon }[] = [
  {
    id: "payments",
    label: "Payments & fees",
    description: "Fees applied to customer checkouts.",
    icon: CreditCard,
  },
];

export function AdminSettingsClient({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [active, setActive] = useState<SectionId>("payments");
  const [saving, setSaving] = useState(false);

  const [feePercent, setFeePercent] = useState(String(settings.serviceFee.bps / 100));
  const [feeFixed, setFeeFixed] = useState((settings.serviceFee.fixedCents / 100).toFixed(2));

  // Inputs → the stored shape (bps + cents); null while either isn't a number.
  const draftFee = useMemo(() => {
    const pct = Number(feePercent);
    const fixed = Number(feeFixed);
    return Number.isFinite(pct) && Number.isFinite(fixed) && feePercent.trim() !== ""
      ? { bps: Math.round(pct * 100), fixedCents: Math.round(fixed * 100) }
      : null;
  }, [feePercent, feeFixed]);

  const isDirty =
    draftFee != null &&
    (draftFee.bps !== settings.serviceFee.bps ||
      draftFee.fixedCents !== settings.serviceFee.fixedCents);

  const handleSave = async () => {
    if (draftFee == null) {
      toast({ title: "Please enter valid numbers", variant: "destructive" });
      return;
    }

    setSaving(true);
    const result = await updateAppSettings({
      serviceFeeBps: draftFee.bps,
      serviceFeeFixedCents: draftFee.fixedCents,
    });
    setSaving(false);

    if (result.success && result.data) {
      toast({ title: "Settings saved." });
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const activeSection = SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Business configuration and admin preferences.
        </p>
      </header>

      <div className="flex flex-col gap-8 md:flex-row md:gap-10">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-visible"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === active;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border border-border bg-card shadow-xs">
            <div className="border-b border-border/60 px-6 py-5">
              <h2 className="text-base font-semibold text-foreground">{activeSection.label}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{activeSection.description}</p>
            </div>

            <div className="divide-y divide-border/60 px-6">
              {active === "payments" && (
                <>
                  <SettingRow
                    label="Card processing fee"
                    description="A percentage of every card payment, shown to customers as a line item. Applies to bookings priced from now on; existing bookings keep the fee they were quoted."
                    hint={
                      draftFee
                        ? `Example: a $1,000 charter paid in full has a ${formatCentsAsCurrency(serviceFeeOn(100_000, draftFee))} fee.`
                        : undefined
                    }
                  >
                    <div className="relative w-32">
                      <Input
                        id="service-fee"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={20}
                        step={0.01}
                        value={feePercent}
                        onChange={(e) => setFeePercent(e.target.value)}
                        className="pr-8 text-right tabular-nums"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </SettingRow>
                  <SettingRow
                    label="Fixed fee per booking"
                    description="Added once per booking, with the guest's first payment (deposit or full)."
                  >
                    <div className="relative w-32">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="service-fee-fixed"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={20}
                        step={0.01}
                        value={feeFixed}
                        onChange={(e) => setFeeFixed(e.target.value)}
                        className="pl-7 text-right tabular-nums"
                      />
                    </div>
                  </SettingRow>
                </>
              )}
            </div>

            {active === "payments" && (
              <div className="flex items-center justify-between gap-4 border-t border-border/60 px-6 py-4">
                <p className="text-xs text-muted-foreground">
                  {settings.updatedAt
                    ? `Last updated ${settings.updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : "Using defaults — not saved yet"}
                </p>
                <Button onClick={handleSave} disabled={!isDirty || saving} className="min-w-24">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            )}

            {active === "theme" && (
              <div className="border-t border-border/60 px-6 py-4">
                <p className="text-xs text-muted-foreground">
                  Theme preferences apply immediately and are stored in your browser on this device.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  hint,
  children,
}: {
  label: string;
  description: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="max-w-md">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {hint && <p className="mt-2 text-xs text-muted-foreground/80">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
