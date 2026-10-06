"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  CalendarSync,
  ChevronLeft,
  ChevronRight,
  Link2,
} from "lucide-react";

import { BoatCalendarSyncModal } from "@/features/boats/components/admin/BoatCalendarSyncModal";
import type { ExternalCalendarListItem } from "@/features/availability/availability.types";
import { BookingCalendarEvent } from "@/features/bookings/booking.types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn, formatCurrency } from "@/shared/lib/utils/general-utils";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "listWeek";

interface BoatCalendarViewProps {
  boatId: string;
  timezone?: string;
  externalCalendars: ExternalCalendarListItem[];
  icalFeedUrl: string | null;
  icalFeedError: string | null;
}

const navBtnClass =
  "h-9 shrink-0 rounded-lg border-0 bg-muted/70 px-3 text-sm font-medium text-foreground shadow-none hover:bg-muted";

function ViewBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function BoatCalendarView({
  boatId,
  timezone,
  externalCalendars,
  icalFeedUrl,
  icalFeedError,
}: BoatCalendarViewProps) {
  const [syncOpen, setSyncOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BookingCalendarEvent | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<CalendarView>("dayGridMonth");
  const [toolbarTitle, setToolbarTitle] = useState("");
  const calendarRef = useRef<FullCalendar>(null);

  const activeCalendars = externalCalendars.filter((c) => c.syncEnabled);
  const isConnected = activeCalendars.length > 0;
  const totalBlocks = activeCalendars.reduce((sum, c) => sum + (c.lastEventCount ?? 0), 0);
  const hasSyncError = activeCalendars.some((c) => c.lastSyncStatus === "ERROR");

  const statusLabel = useMemo(() => {
    if (!isConnected) return null;
    if (hasSyncError) return "Sync issue";
    return `${totalBlocks} block${totalBlocks === 1 ? "" : "s"} synced`;
  }, [hasSyncError, isConnected, totalBlocks]);

  const handleViewChange = useCallback((view: CalendarView) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  }, []);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setToolbarTitle(arg.view.title);
    const viewType = arg.view.type;
    if (
      viewType === "dayGridMonth" ||
      viewType === "timeGridWeek" ||
      viewType === "listWeek"
    ) {
      setCurrentView(viewType);
    }
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    if (!info.event.start) return;
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start.toISOString(),
      end: info.event.end?.toISOString() ?? info.event.start.toISOString(),
      backgroundColor: info.event.backgroundColor,
      borderColor: info.event.borderColor,
      textColor: info.event.textColor,
      extendedProps: info.event.extendedProps as BookingCalendarEvent["extendedProps"],
    });
    setEventModalOpen(true);
  }, []);

  const eventClassNames = useCallback(
    (arg: { event: { extendedProps: Record<string, unknown> } }) => {
      if (arg.event.extendedProps.type === "external") {
        return ["admin-fc-event-external"];
      }
      return [];
    },
    []
  );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{toolbarTitle}</h2>

        <div className="flex flex-wrap items-center gap-2">
          {isConnected && statusLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-sm",
                hasSyncError
                  ? "text-destructive"
                  : "font-medium text-success"
              )}
            >
              <Link2 className="h-3.5 w-3.5" />
              {statusLabel}
            </span>
          )}

          <div className="inline-flex h-9 items-center rounded-lg bg-muted/70 p-1">
            <ViewBtn
              active={currentView === "dayGridMonth"}
              onClick={() => handleViewChange("dayGridMonth")}
            >
              Month
            </ViewBtn>
            <ViewBtn
              active={currentView === "timeGridWeek"}
              onClick={() => handleViewChange("timeGridWeek")}
            >
              Week
            </ViewBtn>
            <ViewBtn
              active={currentView === "listWeek"}
              onClick={() => handleViewChange("listWeek")}
            >
              List
            </ViewBtn>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              className={navBtnClass}
              onClick={() => calendarRef.current?.getApi().prev()}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={navBtnClass}
              onClick={() => calendarRef.current?.getApi().today()}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={navBtnClass}
              onClick={() => calendarRef.current?.getApi().next()}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className={cn(navBtnClass, "gap-1.5")}
            onClick={() => setSyncOpen(true)}
          >
            <CalendarSync className="h-4 w-4" />
            {isConnected ? "Manage sync" : "Connect calendar"}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "admin-fc admin-fc-bare -mx-1 w-[calc(100%+0.5rem)] sm:-mx-2 sm:w-[calc(100%+1rem)]",
          "[&_.fc]:text-sm [&_.fc-event]:cursor-pointer"
        )}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          timeZone={timezone || "local"}
          headerToolbar={false}
          initialView="dayGridMonth"
          editable={false}
          selectable={false}
          dayMaxEvents
          weekends
          events={`/api/admin/calendar-events?boatId=${boatId}`}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventClassNames={eventClassNames}
          eventDisplay="block"
          nowIndicator
          height="auto"
          views={{
            dayGridMonth: {
              fixedWeekCount: false,
              dayHeaderFormat: { weekday: "short" },
            },
            timeGridWeek: {
              dayHeaderFormat: {
                weekday: "short",
                month: "short",
                day: "numeric",
                omitCommas: true,
              },
            },
            listWeek: {
              dayHeaderFormat: {
                weekday: "short",
                month: "short",
                day: "numeric",
                omitCommas: true,
              },
            },
          }}
          slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        />
      </div>

      <BoatCalendarSyncModal
        open={syncOpen}
        onOpenChange={setSyncOpen}
        boatId={boatId}
        calendars={externalCalendars}
        feedUrl={icalFeedUrl}
        feedError={icalFeedError}
      />

      <Dialog
        open={eventModalOpen}
        onOpenChange={(open) => {
          setEventModalOpen(open);
          if (!open) setSelectedEvent(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.extendedProps.type === "external"
                ? "Imported calendar block"
                : "Booking details"}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.extendedProps.type === "external" && (
                <div>
                  <p className="text-sm text-foreground">{selectedEvent.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Synced from an external calendar — this time is blocked for booking.
                  </p>
                </div>
              )}

              {selectedEvent.extendedProps.type === "booking" && (
                <>
                  <div className="flex justify-center">
                    <Badge
                      style={{
                        backgroundColor: selectedEvent.backgroundColor,
                        color: selectedEvent.textColor,
                      }}
                      className="px-3 py-1"
                    >
                      {selectedEvent.extendedProps.bookingStatus}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Customer</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.extendedProps.customerName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.extendedProps.customerEmail}
                    </p>
                    {selectedEvent.extendedProps.customerPhone && (
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.extendedProps.customerPhone}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-foreground">Date & time</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedEvent.start)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedEvent.start).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      ...(timezone ? { timeZone: timezone } : {}),
                    })}
                    {selectedEvent.end
                      ? ` – ${new Date(selectedEvent.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", ...(timezone ? { timeZone: timezone } : {}) })}`
                      : ""}
                  </p>
                </div>
                {selectedEvent.extendedProps.type === "booking" && (
                  <div>
                    <h3 className="font-medium text-foreground">Guests & amount</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.extendedProps.numberOfPassengers} guests
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(selectedEvent.extendedProps.totalAmount)}
                    </p>
                  </div>
                )}
              </div>

              {selectedEvent.extendedProps.type === "booking" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      window.open(`mailto:${selectedEvent.extendedProps.customerEmail}`)
                    }
                  >
                    Email customer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      window.open(`/admin/bookings/${selectedEvent.extendedProps.bookingId}`)
                    }
                  >
                    View details
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
