"use client";

import { useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/lib/hooks/use-toast";

/** Opens the Stripe customer portal: receipts, invoices, saved cards. */
export function BillingPortalButton({ label = "Receipts & invoices" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const open = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error("No portal URL");
      window.location.href = data.url;
    } catch {
      setLoading(false);
      toast({
        title: "Couldn't open billing",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={open} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <Receipt />}
      {label}
    </Button>
  );
}
