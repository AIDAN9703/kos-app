"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute - data considered fresh, won't auto-refetch
            refetchOnWindowFocus: false,
            gcTime: 5 * 60 * 1000, // 5 minutes - unused cache kept in memory before garbage collection
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              const status = (error as { status?: number } | null)?.status;
              if (status != null && status >= 400 && status < 500) {
                return false;
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
