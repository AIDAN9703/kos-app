"use client";

import dynamic from "next/dynamic";
import type { Session } from "next-auth";
import type { ServiceFee } from "@/shared/lib/utils/pricing-utils";

const BookingDetailsClient = dynamic(() => import("./BookingDetailsClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-coral-500" />
    </div>
  ),
});

export default function BookingDetailsClientLoader({
  user,
  serviceFee,
}: {
  user: Session["user"] | null;
  serviceFee: ServiceFee;
}) {
  return <BookingDetailsClient user={user} serviceFee={serviceFee} />;
}
