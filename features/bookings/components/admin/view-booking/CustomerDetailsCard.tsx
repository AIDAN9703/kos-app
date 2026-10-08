"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CopyableText } from "@/shared/admin/components/CopyableText";
import { GlassPanel } from "@/shared/admin/components/glass";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/lib/hooks/use-toast";
import { adminInitials } from "@/shared/lib/utils/people-display";
import { updateBookingSingleField } from "@/features/bookings/actions/deal.actions";
import { useBookingEditMode } from "@/features/bookings/components/admin/view-booking/BookingEditMode";

/**
 * Who the deal is for and who owns it: name, email and phone (copy on
 * click), and the assigned admin. Flips to Name / Email / Phone inputs in the
 * page's edit mode and saves with the same "Done" as the trip — contact
 * details are part of editing the booking, not a separate chore. Saves go
 * through the audited single-field update. Assigning is in the ⋯ menu.
 */
export function CustomerDetailsCard({
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

  return (
    <GlassPanel title="Customer details" className="gap-4">
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
      ) : (
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          <Fact label="Name">
            <span className="text-sm font-medium">{name || <Dash />}</span>
          </Fact>
          <Fact label="Email">
            {email ? <CopyableText value={email} label="email" className="-ml-0.5 text-sm font-medium text-foreground" /> : <Dash />}
          </Fact>
          <Fact label="Phone">
            {phone ? <CopyableText value={phone} label="phone" className="-ml-0.5 text-sm font-medium text-foreground" /> : <Dash />}
          </Fact>
          <Fact label="Assigned to">
            {ownerName ? (
              <span className="flex items-center gap-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-foreground">
                  {adminInitials(ownerName) || "?"}
                </span>
                <span className="truncate text-sm font-semibold">{ownerName}</span>
              </span>
            ) : (
              <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-[10px] font-semibold text-destructive">
                Unassigned
              </span>
            )}
          </Fact>
        </dl>
      )}
    </GlassPanel>
  );
}

function Dash() {
  return <span className="text-sm text-muted-foreground/50">—</span>;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0">{children}</dd>
    </div>
  );
}
