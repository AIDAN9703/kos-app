"use client";

import { useState } from "react";
import type { PublicBoat } from "@/features/boats/boat.types";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils/general-utils";
import { CheckList } from "./detail-ui";

interface FeaturesAmenitiesProps {
  boat: PublicBoat;
}

const INITIAL = 9;

export function FeaturesAmenities({ boat }: FeaturesAmenitiesProps) {
  const [expanded, setExpanded] = useState(false);
  const features = boat.features || [];
  const safety = boat.safetyEquipment || [];

  if (features.length === 0 && safety.length === 0) return null;

  const visFeatures = expanded ? features : features.slice(0, INITIAL);
  const visSafety = expanded ? safety : safety.slice(0, INITIAL);
  const needsToggle = features.length > INITIAL || safety.length > INITIAL;

  return (
    <div className="space-y-6">
      {features.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Features &amp; amenities
          </h3>
          <CheckList items={visFeatures} />
        </div>
      )}

      {safety.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Safety equipment
          </h3>
          <CheckList items={visSafety} />
        </div>
      )}

      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {expanded ? "Show less" : "Show everything"}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
