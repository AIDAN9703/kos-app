"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { signOutAndGoHome } from "@/shared/lib/auth/auth-client";

/**
 * Signs out in the browser, so the session Better Auth keeps there (which the
 * nav reads) clears at the same moment as the server's.
 */
export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOutAndGoHome();
      }}
      className="border-destructive text-destructive hover:bg-destructive/5"
    >
      {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
      Sign out
    </Button>
  );
}
