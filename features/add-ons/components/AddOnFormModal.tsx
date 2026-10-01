"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { addOnCategoryEnum } from "@/database/schema";
import { centsToDollars, dollarsToCents } from "@/shared/lib/utils/money-utils";
import { createAddOn, updateAddOn } from "@/features/add-ons/add-on.mutations";
import { ADD_ON_CATEGORY_LABELS } from "@/features/add-ons/add-on.constants";
import type { AddOnCategory, AddOnListItem } from "@/features/add-ons/add-on.types";

interface AddOnFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the modal edits this add-on; otherwise it creates a new one. */
  addOn?: AddOnListItem | null;
}

const CATEGORIES = addOnCategoryEnum.enumValues as readonly AddOnCategory[];

export function AddOnFormModal({ open, onOpenChange, addOn }: AddOnFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-theme sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{addOn ? "Edit add-on" : "New add-on"}</DialogTitle>
          <DialogDescription>
            Catalog add-ons are reusable across boats. Each boat chooses which to offer and can
            override the price.
          </DialogDescription>
        </DialogHeader>
        {/* Dialog content unmounts when closed, so the form starts from the
            add-on's current values every time it opens. */}
        <AddOnForm
          key={addOn?.id ?? "new"}
          addOn={addOn ?? null}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddOnForm({ addOn, onClose }: { addOn: AddOnListItem | null; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!addOn;

  const [name, setName] = useState(addOn?.name ?? "");
  const [category, setCategory] = useState<AddOnCategory>(
    (addOn?.category as AddOnCategory) ?? "OTHER"
  );
  const [description, setDescription] = useState(addOn?.description ?? "");
  const [priceDollars, setPriceDollars] = useState(
    addOn?.defaultPriceCents != null ? String(centsToDollars(addOn.defaultPriceCents)) : ""
  );
  const [isActive, setIsActive] = useState(addOn?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const trimmedPrice = priceDollars.trim();
    const payload = {
      name: name.trim(),
      category,
      description: description.trim() || null,
      defaultPriceCents: trimmedPrice === "" ? null : dollarsToCents(Number(trimmedPrice)),
      isActive,
      sortOrder: addOn?.sortOrder ?? 0,
      imageUrl: null,
    };

    setSubmitting(true);
    const result = isEdit ? await updateAddOn(addOn.id, payload) : await createAddOn(payload);
    setSubmitting(false);

    if (result.success) {
      toast({ title: isEdit ? "Add-on updated." : "Add-on created." });
      onClose();
      router.refresh();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="addon-name">Name</Label>
        <Input
          id="addon-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cooler with ice"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as AddOnCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {ADD_ON_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="addon-price">Suggested price ($)</Label>
          <Input
            id="addon-price"
            type="number"
            min="0"
            step="0.01"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="addon-desc">Description</Label>
        <Textarea
          id="addon-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown to guests at checkout"
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Active</p>
          <p className="text-xs text-muted-foreground">
            Inactive add-ons can&apos;t be offered on boats.
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="destructive" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create add-on"}
        </Button>
      </DialogFooter>
    </form>
  );
}
