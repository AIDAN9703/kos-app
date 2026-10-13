"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/** Back + the step's main button, pinned to the bottom of the screen on phones. */
export function StepFooter({
  backHref,
  pending,
  label,
  error,
  type = "submit",
  onClick,
  disabled,
}: {
  backHref?: string | null;
  pending?: boolean;
  label: string;
  error?: string;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-10 rounded-b-3xl border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center justify-between gap-3 sm:border-t sm:border-gray-200 sm:pt-6">
        {backHref ? (
          <Link
            href={backHref}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-primary hover:underline"
          >
            Back
          </Link>
        ) : (
          <span />
        )}
        <Button
          type={type}
          onClick={onClick}
          disabled={pending || disabled}
          size="lg"
          className="h-11 min-w-36 rounded-full px-7"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {label}
        </Button>
      </div>
    </div>
  );
}
