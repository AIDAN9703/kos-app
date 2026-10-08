"use client";

import { GlassPanel } from "@/shared/admin/components/glass";
import { EditableField } from "@/shared/components/EditableField";
import { updateMailingAddress } from "@/features/marketing/marketing.actions";

/** Who campaigns come from, and the postal address their footer must carry. */
export function SenderCard({ from, mailingAddress }: { from: string; mailingAddress: string | null }) {
  return (
    <GlassPanel title="Sender" className="gap-0 pb-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-glass-border py-4">
        <p className="text-sm font-medium text-foreground">Sent from</p>
        <p className="text-sm text-muted-foreground">{from}</p>
      </div>
      <EditableField
        label="Mailing address"
        fields={[{ key: "address", label: "Mailing address", type: "textarea", placeholder: "Street, City, State ZIP" }]}
        values={{ address: mailingAddress }}
        displayValue={mailingAddress ?? "Not set. Campaigns can't be sent until it is."}
        editDescription="Printed in the footer of every campaign. US law requires a real postal address."
        onSave={(v) => updateMailingAddress(v.address ?? "")}
      />
    </GlassPanel>
  );
}
