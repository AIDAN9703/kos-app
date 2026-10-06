import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBoatDetail } from "@/features/boats/boat.data";
import { BoatCalendarView } from "@/features/boats/components/admin/BoatCalendarView";
import { getBoatExternalCalendars } from "@/features/availability/actions/external-calendar.queries";
import { buildFeedUrl } from "@/shared/lib/calendar/feed-tokens";
import { getBaseUrl } from "@/shared/lib/utils/base-url";

interface BoatCalendarPageProps {
  params: Promise<{ id: string }>;
}

export default async function BoatCalendarPage({ params }: BoatCalendarPageProps) {
  const { id: boatId } = await params;
  const boat = await getBoatDetail(boatId);

  if (!boat) {
    notFound();
  }

  let icalFeedUrl: string | null = null;
  let icalFeedError: string | null = null;

  try {
    icalFeedUrl = buildFeedUrl(getBaseUrl(), {
      scope: "bookings",
      boatId,
    });
  } catch {
    icalFeedError =
      "Add CALENDAR_FEED_SECRET to .env.local (any long random string), then restart the dev server.";
  }

  const externalCalendars = await getBoatExternalCalendars(boatId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/admin/boats/${boatId}`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{boat.name}</h1>
          <p className="text-sm text-muted-foreground">Booking calendar</p>
        </div>
      </div>

      <BoatCalendarView
        boatId={boatId}
        timezone={boat.timezone ?? undefined}
        externalCalendars={externalCalendars}
        icalFeedUrl={icalFeedUrl}
        icalFeedError={icalFeedError}
      />
    </div>
  );
}
