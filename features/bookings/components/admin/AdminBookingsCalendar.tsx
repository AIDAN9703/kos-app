"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import FullCalendar from "@fullcalendar/react";
import type { DatesSetArg, DayCellMountArg, EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { format } from "date-fns";
import {
  Anchor,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Mail,
  Phone,
  RotateCcw,
  Ship,
  Users,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { bookingSearchParams } from "@/features/bookings/searchParams";
import { formatCentsAsCurrency } from "@/shared/lib/utils/money-utils";
import {
  computeEffectiveGmvCents,
  computeOpsRevenueCents,
} from "@/shared/lib/utils/ops-revenue";
import { cn } from "@/shared/lib/utils/general-utils";
import { useToast } from "@/shared/lib/hooks/use-toast";

type CalendarView = "dayGridMonth" | "listWeek";

interface ExtendedProps {
  bookingId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  boatName: string | null;
  captainFirstName: string | null;
  captainLastName: string | null;
  bookingStatus: string;
  paymentDisplayStatus: string;
  totalAmountCents: number;
  serviceFeeCents: number | null;
  currency: string | null;
  opsGmvCents: number | null;
  opsExpenseCents: number | null;
  needsCaptain: boolean | null;
  numberOfPassengers: number;
}

interface SelectedEvent {
  start: string;
  end: string | null;
  backgroundColor: string;
  extendedProps: ExtendedProps;
}

const calendarBodyClassName = cn(
  "admin-fc min-h-0 flex-1 overflow-hidden px-3 pb-3",
  "[&_.fc]:flex [&_.fc]:h-full [&_.fc]:min-h-0 [&_.fc]:flex-col [&_.fc]:text-sm",
  "[&_.fc-view-harness]:min-h-0 [&_.fc-view-harness]:flex-1 [&_.fc-view-harness]:overflow-auto",
  // Let day-top (+ button) receive hover; events stay clickable.
  "[&_.fc-daygrid-day]:pointer-events-none",
  "[&_.fc-daygrid-day-top]:relative [&_.fc-daygrid-day-top]:z-[2] [&_.fc-daygrid-day-top]:pointer-events-auto",
  "[&_.fc-daygrid-day-events]:pointer-events-auto",
  "[&_.fc-event]:pointer-events-auto [&_.fc-event]:cursor-pointer",
  "[&_.fc-list-event:hover_td]:!bg-muted/40",
);

type DayMenuState = {
  dateKey: string;
  anchor: { top: number; left: number };
};

const DAY_TRIGGER_SELECTOR = "[data-calendar-day-trigger]";

/**
 * /admin/bookings calendar view — shares URL filter state with the table.
 *
 * FullCalendar appends `start` and `end` to the events URL automatically (for
 * the currently visible range); our server route uses those as the date window
 * and applies the rest of the filters from URL search params.
 */
export function AdminBookingsCalendar() {
  const router = useRouter();
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  const [filters] = useQueryStates(bookingSearchParams, {
    clearOnDefault: true,
    shallow: false,
  });
  const [currentView, setCurrentView] = useState<CalendarView>("dayGridMonth");
  const [toolbarTitle, setToolbarTitle] = useState("");
  const [selected, setSelected] = useState<SelectedEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dayMenu, setDayMenu] = useState<DayMenuState | null>(null);

  /**
   * Build the events URL. FullCalendar will append `&start=...&end=...` based on
   * the visible range. Only filters that affect data are forwarded.
   */
  const eventsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.bookingStatus) params.set("bookingStatus", filters.bookingStatus);
    if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
    if (filters.bookingType) params.set("bookingType", filters.bookingType);
    if (filters.assignedAdminId) params.set("assignedAdminId", filters.assignedAdminId);
    if (filters.bookingGroupId) params.set("bookingGroupId", filters.bookingGroupId);
    if (filters.needsCaptain != null)
      params.set("needsCaptain", String(filters.needsCaptain));
    if (filters.minAmount != null) params.set("minAmount", String(filters.minAmount));
    if (filters.maxAmount != null) params.set("maxAmount", String(filters.maxAmount));
    const query = params.toString();
    return query
      ? `/api/admin/bookings/calendar-events?${query}`
      : "/api/admin/bookings/calendar-events";
  }, [filters]);

  const handleViewChange = useCallback((view: CalendarView) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  }, []);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setToolbarTitle(arg.view.title);
    const viewType = arg.view.type;
    if (viewType === "dayGridMonth" || viewType === "listWeek") {
      setCurrentView(viewType);
    }
  }, []);

  const handleDayCellDidMount = useCallback((arg: DayCellMountArg) => {
    if (arg.view.type !== "dayGridMonth") return;

    const host =
      (arg.el.querySelector(".fc-daygrid-day-top") as HTMLElement | null) ?? arg.el;
    host.classList.add("group");
    if (host.querySelector(DAY_TRIGGER_SELECTOR)) return;

    const dateKey = format(arg.date, "yyyy-MM-dd");
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.dataset.calendarDayTrigger = "true";
    trigger.setAttribute("aria-label", `Actions for ${format(arg.date, "MMMM d, yyyy")}`);
    trigger.className = cn(
      "absolute right-0 top-0 z-20 flex h-6 w-6 items-center justify-center rounded-md",
      "border border-border bg-card text-foreground shadow-sm",
      "opacity-0 transition-opacity pointer-events-none",
      "group-hover:opacity-100 group-hover:pointer-events-auto",
      "hover:bg-muted focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      arg.isOther && "group-hover:opacity-80",
    );
    trigger.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = trigger.getBoundingClientRect();
      setDayMenu({
        dateKey,
        anchor: { top: rect.bottom + 4, left: Math.max(8, rect.right - 168) },
      });
    });

    host.appendChild(trigger);
  }, []);

  const handleDayCellWillUnmount = useCallback((arg: DayCellMountArg) => {
    arg.el.querySelector(DAY_TRIGGER_SELECTOR)?.remove();
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    if (!info.event.start) return;
    setSelected({
      start: info.event.start.toISOString(),
      end: info.event.end ? info.event.end.toISOString() : null,
      backgroundColor: info.event.backgroundColor,
      extendedProps: info.event.extendedProps as ExtendedProps,
    });
    setModalOpen(true);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{toolbarTitle}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-8 items-center rounded-md border border-border bg-card p-0.5">
              <ViewBtn
                active={currentView === "dayGridMonth"}
                onClick={() => handleViewChange("dayGridMonth")}
              >
                Month
              </ViewBtn>
              <ViewBtn active={currentView === "listWeek"} onClick={() => handleViewChange("listWeek")}>
                List
              </ViewBtn>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => calendarRef.current?.getApi().prev()}
              aria-label="Previous"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => calendarRef.current?.getApi().today()}
              aria-label="Today"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => calendarRef.current?.getApi().next()}
              aria-label="Next"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className={calendarBodyClassName}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            height="100%"
            editable={false}
            selectable={false}
            dayMaxEvents
            weekends
            events={eventsUrl}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            dayCellDidMount={handleDayCellDidMount}
            dayCellWillUnmount={handleDayCellWillUnmount}
            eventDisplay="block"
            views={{
              dayGridMonth: {
                // Column headers are weekdays only (not specific dates).
                dayHeaderFormat: { weekday: "long" },
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
            nowIndicator
          />
        </div>
      </div>

      {dayMenu ? (
        <CalendarDayActionMenu
          state={dayMenu}
          onClose={() => setDayMenu(null)}
          onBlockOffDate={() => {
            toast({
              title: "Block off date",
              description:
                "Boat blocking is stored in the database but there is no admin UI to create blocks yet.",
            });
            setDayMenu(null);
          }}
        />
      ) : null}

      <BookingEventDialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSelected(null);
        }}
        event={selected}
        onView={(bookingId) => {
          setModalOpen(false);
          setSelected(null);
          router.push(`/admin/bookings/${bookingId}`);
        }}
      />
    </div>
  );
}

function CalendarDayActionMenu({
  state,
  onClose,
  onBlockOffDate,
}: {
  state: DayMenuState;
  onClose: () => void;
  onBlockOffDate: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        aria-label="Close day menu"
        onClick={onClose}
      />
      <div
        role="menu"
        className="fixed z-50 min-w-[168px] rounded-md border border-border bg-popover p-1 shadow-md"
        style={{ top: state.anchor.top, left: state.anchor.left }}
      >
        <Link
          href={`/admin/bookings/create?date=${state.dateKey}`}
          role="menuitem"
          className="flex w-full rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted"
          onClick={onClose}
        >
          Add booking
        </Link>
        <button
          type="button"
          role="menuitem"
          className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
          onClick={onBlockOffDate}
        >
          Block off date
        </button>
      </div>
    </>
  );
}

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
        "inline-flex h-7 items-center rounded-[6px] px-2.5 text-xs font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function BookingEventDialog({
  open,
  onOpenChange,
  event,
  onView,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SelectedEvent | null;
  onView: (id: string) => void;
}) {
  if (!event) return null;
  const p = event.extendedProps;
  const captain =
    p.captainFirstName || p.captainLastName
      ? `${p.captainFirstName ?? ""} ${p.captainLastName ?? ""}`.trim()
      : null;
  const startDate = new Date(event.start);
  const endDate = event.end ? new Date(event.end) : null;
  const gmvCents =
    computeEffectiveGmvCents(p.opsGmvCents, p.totalAmountCents, p.serviceFeeCents) ?? 0;
  const revenueCents =
    p.opsExpenseCents != null
      ? computeOpsRevenueCents(
          p.opsGmvCents,
          p.totalAmountCents,
          p.opsExpenseCents,
          p.serviceFeeCents
        )
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: event.backgroundColor }}
              aria-hidden
            />
            {p.customerName ?? "Unknown customer"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              {p.bookingStatus}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              <CreditCard className="h-3 w-3" />
              {p.paymentDisplayStatus}
            </span>
          </div>

          <Row icon={CalendarDays} label="Date">
            {format(startDate, "EEE, MMM d, yyyy")}
            <span className="text-muted-foreground">
              {" · "}
              {format(startDate, "h:mm a")}
              {endDate ? ` – ${format(endDate, "h:mm a")}` : ""}
            </span>
          </Row>

          <Row icon={Ship} label="Boat">
            {p.boatName ?? "—"}
          </Row>

          <Row icon={Anchor} label="Captain">
            {captain ?? (p.needsCaptain ? <em className="text-warning">Captain needed</em> : "Self-drive")}
          </Row>

          <Row icon={Users} label="Guests">
            {p.numberOfPassengers}
          </Row>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Tile
              label="GMV"
              value={formatCentsAsCurrency(gmvCents, { currency: p.currency ?? "USD" })}
              tone="neutral"
            />
            <Tile
              label="Revenue"
              value={
                revenueCents != null
                  ? formatCentsAsCurrency(revenueCents, { currency: p.currency ?? "USD" })
                  : "—"
              }
              tone={revenueCents == null ? "muted" : revenueCents < 0 ? "negative" : "positive"}
            />
          </div>

          {(p.customerEmail || p.customerPhone) && (
            <div className="space-y-1 border-t border-border pt-2">
              {p.customerEmail && (
                <a
                  href={`mailto:${p.customerEmail}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-3 w-3" />
                  {p.customerEmail}
                </a>
              )}
              {p.customerPhone && (
                <a
                  href={`tel:${p.customerPhone}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-3 w-3" />
                  {p.customerPhone}
                </a>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/bookings/${p.bookingId}`}>Open details</Link>
            </Button>
            <Button size="sm" onClick={() => onView(p.bookingId)}>
              Go to booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        tone === "positive" && "border-success/30 bg-success-soft/50",
        tone === "negative" && "border-destructive/30 bg-destructive-soft/50",
        tone === "muted" && "border-border bg-muted/30",
        tone === "neutral" && "border-border bg-card",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
