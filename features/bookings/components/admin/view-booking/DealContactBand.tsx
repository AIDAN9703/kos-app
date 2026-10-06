"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { adminInitials } from "@/shared/lib/utils/people-display";
import { updateBookingSingleField } from "@/features/bookings/actions/deal.actions";
import { useBookingEditMode } from "@/features/bookings/components/admin/view-booking/BookingEditMode";

/**
 * Who the deal is for and who owns it, on one line under the name. Flips to
 * Name / Email / Phone inputs in the page's edit mode and saves with the
 * same "Done" as the trip — contact details are part of editing the booking,
 * not a separate chore. Saves go through the audited single-field update.
 */
export function DealContactBand({
  bookingId,
  name,
  email,
  phone,
  ownerName,
}: {
  bookingId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  ownerName: string | null;
}) {
  const { editing, registerSaver } = useBookingEditMode();
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: name ?? "", email: email ?? "", phone: phone ?? "" });

  // Re-seed from the booking each time edit mode opens.
  const [wasEditing, setWasEditing] = useState(editing);
  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) setForm({ name: name ?? "", email: email ?? "", phone: phone ?? "" });
  }

  const saveRef = useRef<() => Promise<{ ok: boolean }>>(async () => ({
    ok: true,
  }));
  useEffect(() => {
    if (!editing) return;
    return registerSaver("contact-details", () => saveRef.current());
  }, [editing, registerSaver]);

  async function handleSave(): Promise<{ ok: boolean }> {
    const next = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    const changes: Array<{ field: "customerName" | "customerEmail" | "customerPhone"; value: string }> = [];
    if (next.name && next.name !== (name ?? "")) changes.push({ field: "customerName", value: next.name });
    if (next.email && next.email !== (email ?? "")) changes.push({ field: "customerEmail", value: next.email });
    // Phone can be corrected but not blanked — texts and account claiming key off it.
    if (next.phone && next.phone !== (phone ?? "")) changes.push({ field: "customerPhone", value: next.phone });
    if (changes.length === 0) return { ok: true };
    if (!/.+@.+\..+/.test(next.email)) {
      toast({ title: "That email doesn't look right", variant: "destructive" });
      return { ok: false };
    }
    for (const change of changes) {
      const res = await updateBookingSingleField(bookingId, change);
      if (!res.success) {
        toast({ title: "Couldn't save contact details", description: res.error, variant: "destructive" });
        return { ok: false };
      }
    }
    toast({ title: "Contact details saved" });
    router.refresh();
    return { ok: true };
  }
  useEffect(() => {
    saveRef.current = handleSave;
  });

  if (editing) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={phone ? undefined : "Not on file"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
      <Field label="Email" value={email} />
      <Field label="Phone" value={phone} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Assigned to
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {ownerName ? (
            <>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-foreground">
                {adminInitials(ownerName) || "?"}
              </span>
              <p className="truncate text-sm font-semibold">{ownerName}</p>
            </>
          ) : (
            <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-[10px] font-semibold text-destructive">
              Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium">
        {value || <span className="text-muted-foreground/40">—</span>}
      </p>
    </div>
  );
}
