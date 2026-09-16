"use client";

import { useState, useTransition } from "react";
import type { NotificationPreference } from "@/database/types";
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
import {
  updateNotificationPreferences,
  type NotificationPreferencesInput,
} from "../../actions/account.actions";

interface NotificationPreferencesFormProps {
  emailNotifications: NotificationPreference;
  smsNotifications: NotificationPreference;
  marketingEmailsEnabled: boolean;
}

const LEVELS: { value: NotificationPreference; label: string }[] = [
  { value: "ALL", label: "All updates" },
  { value: "IMPORTANT_ONLY", label: "Important only" },
  { value: "NONE", label: "Off" },
];

/** Saves on change; reverts the control if the server says no. */
export function NotificationPreferencesForm(initial: NotificationPreferencesFormProps) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(initial);
  const [, startTransition] = useTransition();

  const save = (change: NotificationPreferencesInput) => {
    const previous = prefs;
    setPrefs((p) => ({ ...p, ...change }));
    startTransition(async () => {
      const result = await updateNotificationPreferences(change);
      if (!result.success) {
        setPrefs(previous);
        toast({ title: "Couldn't save", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="divide-y divide-gray-200 border-b border-gray-200">
      <LevelRow
        id="email-notifications"
        label="Email"
        description="Booking confirmations, proposals and trip reminders."
        value={prefs.emailNotifications}
        onChange={(v) => save({ emailNotifications: v })}
      />
      <LevelRow
        id="sms-notifications"
        label="Text messages"
        description="Day-of updates from your captain and the KOS team."
        value={prefs.smsNotifications}
        onChange={(v) => save({ smsNotifications: v })}
      />
      <div className="flex items-center justify-between gap-4 py-4">
        <div>
          <Label htmlFor="marketing-emails" className="text-sm font-medium text-primary">
            News & offers
          </Label>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Occasional emails about new boats, destinations and member offers.
          </p>
        </div>
        <Switch
          id="marketing-emails"
          checked={prefs.marketingEmailsEnabled}
          onCheckedChange={(checked) => save({ marketingEmailsEnabled: checked })}
        />
      </div>
    </div>
  );
}

function LevelRow({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: NotificationPreference;
  onChange: (value: NotificationPreference) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-primary">
          {label}
        </Label>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <Select value={value} onValueChange={(v) => onChange(v as NotificationPreference)}>
        <SelectTrigger id={id} className="h-10 w-[160px] rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEVELS.map((level) => (
            <SelectItem key={level.value} value={level.value}>
              {level.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
