"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, Pencil } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * Page-level edit mode for the booking detail page. "Edit trip" flips the
 * trip card (and the header's contact row) into forms; "Done" runs every
 * registered save in order and closes edit mode only if all succeed. Sending
 * the customer the updated link happens in the Breakdown card afterwards.
 */
type EditSaver = () => Promise<{ ok: boolean }>;

const Ctx = createContext<{
  editing: boolean;
  saving: boolean;
  setEditing: (editing: boolean) => void;
  registerSaver: (id: string, saver: EditSaver) => () => void;
}>({
  editing: false,
  saving: false,
  setEditing: () => {},
  registerSaver: () => () => {},
});

export function BookingEditModeProvider({ children }: { children: ReactNode }) {
  const [editing, setEditingState] = useState(false);
  const [saving, setSaving] = useState(false);
  const saversRef = useRef(new Map<string, EditSaver>());

  const registerSaver = useCallback((id: string, saver: EditSaver) => {
    saversRef.current.set(id, saver);
    return () => {
      saversRef.current.delete(id);
    };
  }, []);

  const setEditing = (next: boolean) => {
    if (next || !editing) {
      setEditingState(next);
      return;
    }
    void (async () => {
      setSaving(true);
      try {
        for (const saver of saversRef.current.values()) {
          const r = await saver();
          if (!r.ok) return; // the card already toasted
        }
        setEditingState(false);
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <Ctx.Provider value={{ editing, saving, setEditing, registerSaver }}>{children}</Ctx.Provider>
  );
}

export function useBookingEditMode() {
  return useContext(Ctx);
}

export function BookingPageEditButton({ label = "Edit trip" }: { label?: string }) {
  const { editing, saving, setEditing } = useBookingEditMode();
  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 gap-1.5 rounded-full border-0 bg-foreground/10 px-4 text-primary-strong hover:bg-foreground/15 hover:text-primary-strong"
      onClick={() => setEditing(!editing)}
      disabled={saving}
    >
      {editing ? (
        <>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving…" : "Done"}
        </>
      ) : (
        <>
          <Pencil className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}
