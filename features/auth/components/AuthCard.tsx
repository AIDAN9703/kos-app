import type { ReactNode } from "react";

/** The white card the sign-in pages sit in, for the smaller account pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center sm:mb-7">
        <h1 className="text-lg font-semibold text-primary sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
