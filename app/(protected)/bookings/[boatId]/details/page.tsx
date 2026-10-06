import { Suspense } from "react";
import BookingDetailsClientLoader from "@/features/bookings/components/BookingDetailsClientLoader";
import { getServiceFee } from "@/features/app-settings/app-settings.data";
import { getSession } from "@/shared/lib/utils/auth-utils";

export default async function BookingDetailsPage() {
  const [session, serviceFee] = await Promise.all([getSession(), getServiceFee()]);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-coral-500" />
        </div>
      }
    >
      <BookingDetailsClientLoader
        user={session?.user || null}
        serviceFee={serviceFee}
      />
    </Suspense>
  );
}

