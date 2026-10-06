"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicBoat } from "@/features/boats/boat.types";
import { cn } from "@/shared/lib/utils/general-utils";

interface DescriptionProps {
  boat: PublicBoat;
}

export function Description({ boat }: DescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const description = boat.description?.trim() || "No description provided.";
  const isLong = description.length > 420;
  const text = !expanded && isLong ? description.slice(0, 420).trimEnd() + "…" : description;

  return (
    <div>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">{text}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
