"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

import { formatCurrency } from "@/shared/lib/utils/general-utils";

import type { BookingAddOnInput } from "@/features/bookings/booking.types";

const LABELS = {
  default: "Add-ons",
  group: "Add-ons (linked to first booking)",
} as const;

interface AddOnsFieldsProps {
  lineItems: BookingAddOnInput[];
  onChange: (items: BookingAddOnInput[]) => void;
  variant?: keyof typeof LABELS;
}

export function AddOnsFields({ lineItems, onChange, variant = "default" }: AddOnsFieldsProps) {
  const addItem = () =>
    onChange([...lineItems, { name: "", description: "", unitPrice: 0, quantity: 1 }]);

  const updateItem = (idx: number, updates: Partial<BookingAddOnInput>) =>
    onChange(lineItems.map((v, i) => (i === idx ? { ...v, ...updates } : v)));

  const removeItem = (idx: number) => onChange(lineItems.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label>{LABELS[variant]}</Label>
        {/* Header-pill style: soft fill, no border, gold text. */}
        <Button
          type="button"
          variant="soft"
          size="sm"
          className="gap-1.5 rounded-full px-4 text-primary-strong"
          onClick={addItem}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {lineItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
          No add-ons. Click Add to add one.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-24">Unit Price</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-24 text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Input
                    placeholder="e.g. Champagne"
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
