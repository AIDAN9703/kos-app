"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Where deal links point from client components: the admin board
 * ("/admin/bookings", the default) or the broker portal ("/brokers/deals").
 * The broker portal's layout sets it once for everything inside.
 */
const DealsBasePathContext = createContext("/admin/bookings");

export function DealsBasePathProvider({ basePath, children }: { basePath: string; children: ReactNode }) {
  return <DealsBasePathContext.Provider value={basePath}>{children}</DealsBasePathContext.Provider>;
}

export function useDealsBasePath(): string {
  return useContext(DealsBasePathContext);
}
