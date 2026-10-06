"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  getBookingExpenseDefaults,
  getBookingExpenseLines,
  saveBookingExpenseLines,
} from "@/features/bookings/actions/deal.actions";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/features/bookings/constants/expense-categories";
import type {
  BookingExpenseLine,
  BookingExpenseLineDraft,
  BookingExpenseLineInput,
} from "@/features/bookings/booking-expense.types";
import type { BookingExpenseCategory } from "@/database/types";
import {
  centsToDollars,
  formatCentsAsCurrency,
  parseDollarsToCents,
} from "@/shared/lib/utils/money-utils";
import {
  computeEffectiveGmvCents,
  computeOpsRevenueCents,
} from "@/shared/lib/utils/ops-revenue";
import { useToast } from "@/shared/lib/hooks/use-toast";

function newDraftKey() {
  return `draft-${crypto.randomUUID()}`;
}

function lineToDraft(line: BookingExpenseLine): BookingExpenseLineDraft {
  return {
    key: line.id ?? newDraftKey(),
    category: line.category,
    amountDollars: centsToDollars(line.amountCents).toFixed(2),
    label: line.label ?? "",
    source: line.source,
  };
}

function emptyDraft(category: BookingExpenseCategory = "OWNER_PAYOUT"): BookingExpenseLineDraft {
  return {
    key: newDraftKey(),
    category,
    amountDollars: "",
    label: "",
    source: "MANUAL",
  };
}

function draftsToInput(drafts: BookingExpenseLineDraft[]): BookingExpenseLineInput[] {
  return drafts
    .filter((draft) => draft.amountDollars.trim())
    .map((draft, index) => ({
      category: draft.category,
      amountCents: parseDollarsToCents(draft.amountDollars),
      label: draft.category === "OTHER" && draft.label.trim() ? draft.label.trim() : null,
      sortOrder: index,
      source: draft.source,
    }));
}

export interface BookingExpensesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  totalAmountCents?: number | null;
  serviceFeeCents?: number | null;
  opsGmvCents?: number | null;
  /** ISO 4217 currency for this booking (from booking_pricing.currency / boat.currency). */
  currency?: string;
  /** When provided, skips fetch on open (detail page). */
  initialLines?: BookingExpenseLine[];
}

export function BookingExpensesModal({
  open,
  onOpenChange,
  bookingId,
  totalAmountCents,
  serviceFeeCents,
  opsGmvCents,
  currency = "USD",
  initialLines,
}: BookingExpensesModalProps) {
  const fmt = (cents: number) => formatCentsAsCurrency(cents, { currency });
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<BookingExpenseLineDraft[]>([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      let lines = initialLines;
      if (lines === undefined) {
        const result = await getBookingExpenseLines(bookingId);
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
        lines = result.data ?? [];
      }

      if (lines.length > 0) {
        setRows(lines.map(lineToDraft));
        return;
      }

      const defaultsResult = await getBookingExpenseDefaults(bookingId);
      if (!defaultsResult.success) {
        toast({
          title: "Error",
          description: defaultsResult.error,
          variant: "destructive",
        });
        setRows([emptyDraft()]);
        return;
      }

      const defaults = defaultsResult.data ?? [];
      if (defaults.length > 0) {
        setRows(
          defaults.map((line) =>
            lineToDraft({
              id: null,
              bookingId,
              category: line.category,
              amountCents: line.amountCents,
              label: line.label ?? null,
              sortOrder: line.sortOrder ?? 0,
              source: line.source ?? "BOAT_DEFAULT",
            })
          )
        );
      } else {
        setRows([emptyDraft()]);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, initialLines, toast]);

  useEffect(() => {
    if (open) {
      void loadRows();
    }
  }, [open, loadRows]);

  const ownerPayoutCents = useMemo(
    () =>
      rows.reduce((sum, row) => {
        if (row.category !== "OWNER_PAYOUT" || !row.amountDollars.trim()) return sum;
        try {
          return sum + parseDollarsToCents(row.amountDollars);
        } catch {
          return sum;
        }
      }, 0),
    [rows]
  );

  const otherCostsCents = useMemo(
    () =>
      rows.reduce((sum, row) => {
        if (row.category === "OWNER_PAYOUT" || !row.amountDollars.trim()) return sum;
        try {
          return sum + parseDollarsToCents(row.amountDollars);
        } catch {
          return sum;
        }
      }, 0),
    [rows]
  );

  const totalCostsCents = ownerPayoutCents + otherCostsCents;
  const revenuePreview = computeOpsRevenueCents(
    opsGmvCents,
    totalAmountCents,
    totalCostsCents > 0 ? totalCostsCents : null,
    serviceFeeCents
  );

  const effectiveGmv = computeEffectiveGmvCents(opsGmvCents, totalAmountCents, serviceFeeCents);

  function updateRow(key: string, patch: Partial<BookingExpenseLineDraft>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch, source: "MANUAL" } : row))
    );
  }

  function addRow() {
    setRows((current) => [...current, emptyDraft()]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const lines = draftsToInput(rows);
      const result = await saveBookingExpenseLines(bookingId, lines);
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Expenses saved" });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save expenses",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Booking expenses</DialogTitle>
          <DialogDescription>
            Every line deducts from REV; owner payout also drives the owner balance.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,7rem)_1fr_auto]"
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select
                      value={row.category}
                      onValueChange={(value) =>
                        updateRow(row.key, { category: value as BookingExpenseCategory })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {EXPENSE_CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={row.amountDollars}
                      onChange={(e) => updateRow(row.key, { amountDollars: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {row.category === "OTHER" ? "Label" : "Note"}
                    </Label>
                    <Input
                      placeholder={row.category === "OTHER" ? "Describe expense" : "Optional"}
                      value={row.label}
                      onChange={(e) => updateRow(row.key, { label: e.target.value })}
                      disabled={row.category !== "OTHER"}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length <= 1}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add row
            </Button>

            <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Effective GMV</span>
                <span className="font-medium tabular-nums">
                  {effectiveGmv != null ? fmt(effectiveGmv) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Owner payout</span>
                <span className="font-medium tabular-nums">
                  {fmt(ownerPayoutCents)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Other costs</span>
                <span className="font-medium tabular-nums">
                  {fmt(otherCostsCents)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-border/60 pt-2">
                <span className="font-medium">KOS revenue preview</span>
                <span className="font-semibold tabular-nums text-success">
                  {revenuePreview != null ? fmt(revenuePreview) : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="destructive" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save expenses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
