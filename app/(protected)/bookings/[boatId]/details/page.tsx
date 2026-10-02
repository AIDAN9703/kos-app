import { Suspense } from "react";
import { auth } from "@/auth";
import BookingDetailsClientLoader from "@/features/bookings/components/BookingDetailsClientLoader";
import { getAppSettings } from "@/features/app-settings/app-settings.service";

export default async function BookingDetailsPage() {
  const [session, settings] = await Promise.all([auth(), getAppSettings()]);

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
        serviceFee={settings.serviceFee}
      />
    </Suspense>
  );
}

