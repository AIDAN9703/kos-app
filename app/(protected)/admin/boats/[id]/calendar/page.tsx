import { notFound } from "next/navigation";
import { getBoatDetail } from "@/features/boats/boat.data";
import { BoatCalendarView } from "@/features/boats/components/admin/BoatCalendarView";
import { listExternalCalendars } from "@/features/availability/availability.data";
import { buildFeedUrl } from "@/shared/lib/calendar/feed-tokens";
import { getBaseUrl } from "@/shared/lib/utils/base-url";
import { BackButton } from "@/shared/admin/components/BackButton";

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

  const externalCalendars = await listExternalCalendars(boatId);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 flex-col">
      <div className="mb-5 flex items-center gap-4">
        <BackButton href={`/admin/boats/${boatId}`} />
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
