"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";

/**
 * Text that copies itself on click; a copy icon shows on hover. It stops the
 * click from reaching a clickable table row, so copying never navigates.
 */
export function CopyableText({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      title={copied ? "Copied!" : `Copy ${label ?? value}`}
      className={cn(
        "group/copy relative z-10 inline-flex max-w-full items-center gap-1 rounded-md px-0.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        className
      )}
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-success" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/copy:opacity-100" />
      )}
    </button>
  );
}
