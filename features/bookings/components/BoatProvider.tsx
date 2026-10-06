"use client";

import React, { createContext, useContext } from "react";
import type { PublicBoat } from "@/features/boats/boat.types";

interface BoatProviderProps {
  boat: PublicBoat;
  children: React.ReactNode;
}

const BoatContext = createContext<PublicBoat | null>(null);

export default function BoatProvider({ boat, children }: BoatProviderProps) {
  return <BoatContext.Provider value={boat}>{children}</BoatContext.Provider>;
}

export function useBoat(): PublicBoat {
  const ctx = useContext(BoatContext);
  if (!ctx) {
    throw new Error("useBoat must be used within BoatProvider");
  }
  return ctx;
}
