"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { TimelineBoat, TimelineKind, TimelineSegment } from "@/features/admin/dashboard.types";
import { cn } from "@/shared/lib/utils/general-utils";
import { formatBoatLocal, getBoatTimezone } from "@/shared/lib/utils/date-helpers";
import { Panel, Segmented } from "./Panel";

/* Each day column shows 6 AM to midnight in the boat's own time: nights are
   almost always empty, and dropping them makes a 4-hour charter readable. */
const DAY_FROM = "06:00:00";
const LABEL_W = 176;
const MIN_TRACK = 880 - LABEL_W;

const KIND_LABELS: Record<TimelineKind, string> = {
  booked: "Booked",
  proposed: "Proposal",
  external: "Imported calendar",
  block: "Blocked",
};

const BAR: Record<TimelineKind, string> = {
  booked: "bg-primary text-primary-foreground",
  proposed: "border border-dashed border-primary bg-primary/10 text-primary",
  external:
    "text-foreground/80 ring-1 ring-inset ring-muted-foreground/40 bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--muted-foreground)_35%,transparent)_0_2px,transparent_2px_7px)]",
  block:
    "text-destructive ring-1 ring-inset ring-destructive/50 bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--destructive)_35%,transparent)_0_2px,transparent_2px_7px)]",
};

interface Window {
  from: number;
  to: number;
}

interface Piece {
  seg: TimelineSegment;
  /** Where this piece starts (a segment can run across several days). */
  start: number;
  left: number; // 0..1 across the whole range
  width: number;
}

/** The boat-local 6 AM–midnight window for each calendar date. */
function windowsFor(dates: string[], timezone: string | null): Window[] {
  const tz = getBoatTimezone({ timezone });
  return dates.map((date) => {
    const next = format(addDays(new Date(`${date}T12:00:00`), 1), "yyyy-MM-dd");
    return {
      from: fromZonedTime(`${date}T${DAY_FROM}`, tz).getTime(),
      to: fromZonedTime(`${next}T00:00:00`, tz).getTime(),
    };
  });
}

/** Cut a segment into per-day pieces, clipped to each day's window. */
function cut(seg: TimelineSegment, windows: Window[]): Piece[] {
  const start = new Date(seg.start).getTime();
  const end = new Date(seg.end).getTime();
  return windows.flatMap((w, i) => {
    const s = Math.max(start, w.from);
    const e = Math.min(end, w.to);
    if (e <= s) return [];
    const span = w.to - w.from;
    return [{ seg, start: s, left: (i + (s - w.from) / span) / windows.length, width: (e - s) / span / windows.length }];
  });
}

/** Where `now` falls across a row, or null when it's outside the range. */
function nowAt(now: number, windows: Window[]): number | null {
  const i = windows.findIndex((w) => now >= w.from && now < w.to);
  if (i < 0) return null;
  const w = windows[i];
  return (i + (now - w.from) / (w.to - w.from)) / windows.length;
}

/** "12p", "4:30p" — fits in a narrow bar. */
function shortTime(date: Date, timezone: string | null) {
  return formatBoatLocal(date, timezone, "h:mmaaaaa").replace(":00", "");
}

/**
 * Every active boat against the coming days: booked trips, proposals,
 * imported calendar events and manual blocks, with a mark at now. Proposals
 * the customer can't pay are outlined red. Each row is in its boat's own
 * time zone. Rendered after mount: the dates are the
 * viewer's.
 */
export function FleetTimeline({ boats, conflictIds }: { boats: TimelineBoat[]; conflictIds: string[] }) {
  // Proposals the payment check would block (from the action queue).
  const clashes = useMemo(() => new Set(conflictIds), [conflictIds]);
  const [range, setRange] = useState<"7" | "14">("7");
  const [showIdle, setShowIdle] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [trackPx, setTrackPx] = useState(MIN_TRACK);
  const [hover, setHover] = useState<{
    piece: Piece;
    timezone: string | null;
    clash: boolean;
    x: number;
    y: number;
  } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setTrackPx(Math.max(entry.contentRect.width - LABEL_W, MIN_TRACK))
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dates = useMemo(
    () =>
      now == null
        ? []
        : Array.from({ length: Number(range) }, (_, i) => format(addDays(new Date(now), i), "yyyy-MM-dd")),
    [now, range]
  );

  const rows = useMemo(() => {
    const all = boats.map((boat) => {
      const windows = windowsFor(dates, boat.timezone);
      return { boat, windows, pieces: boat.segments.flatMap((s) => cut(s, windows)) };
    });
    const booked = (r: (typeof all)[number]) => new Set(r.pieces.filter((p) => p.seg.kind === "booked").map((p) => p.seg.id)).size;
    return {
      busy: all.filter((r) => r.pieces.length > 0).sort((a, b) => booked(b) - booked(a) || a.boat.name.localeCompare(b.boat.name)),
      idle: all.filter((r) => r.pieces.length === 0),
      booked,
    };
  }, [boats, dates]);

  function showTip(piece: Piece, timezone: string | null, clash: boolean, el: HTMLElement) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    const r = el.getBoundingClientRect();
    setHover({ piece, timezone, clash, x: r.left - box.left + frame.current!.scrollLeft + r.width / 2, y: r.top - box.top });
  }

  const visible = showIdle ? [...rows.busy, ...rows.idle] : rows.busy;
  const weekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
  const today = now == null ? "" : format(new Date(now), "yyyy-MM-dd");

  return (
    <Panel
      title={`Fleet, next ${range} days`}
      actions={
        <>
          <div className="hidden items-center gap-4 lg:flex">
            {(["booked", "proposed", "external", "block"] as TimelineKind[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-4 rounded-sm", BAR[k])} />
                {KIND_LABELS[k]}
              </span>
            ))}
          </div>
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
            ]}
          />
        </>
      }
    >
      <div ref={frame} className="relative overflow-x-auto" onMouseLeave={() => setHover(null)}>
        {now == null ? (
          <div className="h-48" />
        ) : (
          <div className="min-w-[880px]">
            <div className="flex border-b border-border" style={{ paddingLeft: LABEL_W }}>
              {dates.map((date) => (
                <div
                  key={date}
                  className={cn(
                    "flex-1 border-l border-border px-2 py-2 text-xs",
                    weekend(date) && "bg-muted/30",
                    date === today ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span className="font-medium">{format(new Date(`${date}T12:00:00`), "EEE")}</span>{" "}
                  <span className={cn("tabular-nums", date === today ? "font-semibold" : "text-foreground/80")}>
                    {format(new Date(`${date}T12:00:00`), "d")}
                  </span>
                </div>
              ))}
            </div>

            {visible.length === 0 && (
              <p className="px-4 py-8 text-sm text-muted-foreground">Nothing on any boat&apos;s calendar in this range.</p>
            )}

            {visible.map((row) => {
              const { boat, windows, pieces } = row;
              const nowX = nowAt(now, windows);
              const count = rows.booked(row);
              return (
                <div key={boat.id} className="flex h-10 border-b border-border">
                  <Link
                    href={`/admin/boats/${boat.id}/calendar`}
                    className="flex shrink-0 items-center justify-between gap-2 px-4 text-[13px] text-foreground hover:text-primary"
                    style={{ width: LABEL_W }}
                  >
                    <span className="truncate">{boat.name}</span>
                    {count > 0 && <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>}
                  </Link>
                  <div className="relative flex-1">
                    <div className="absolute inset-0 flex">
                      {dates.map((date) => (
                        <div key={date} className={cn("relative flex-1 border-l border-border", weekend(date) && "bg-muted/30")}>
                          {/* noon and 6 PM */}
                          <span className="absolute inset-y-0 left-1/3 border-l border-dashed border-border/60" />
                          <span className="absolute inset-y-0 left-2/3 border-l border-dashed border-border/60" />
                        </div>
                      ))}
                    </div>
                    {nowX != null && (
                      <span aria-hidden className="absolute inset-y-0 z-10 w-px bg-primary" style={{ left: `${nowX * 100}%` }} />
                    )}
                    {pieces.map((p, i) => {
                      const px = p.width * trackPx;
                      const text =
                        px > 96 ? p.seg.label : px > 30 ? shortTime(new Date(p.start), boat.timezone) : "";
                      const clash = clashes.has(p.seg.id);
                      const className = cn(
                        "absolute inset-y-1.5 flex items-center overflow-hidden rounded-[5px] px-1.5 text-[10px] font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        BAR[p.seg.kind],
                        clash && "z-[5] border-solid border-destructive bg-destructive-soft text-destructive"
                      );
                      const style = { left: `${p.left * 100}%`, width: `max(${p.width * 100}%, 4px)` };
                      const handlers = {
                        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showTip(p, boat.timezone, clash, e.currentTarget),
                        onFocus: (e: React.FocusEvent<HTMLElement>) => showTip(p, boat.timezone, clash, e.currentTarget),
                        onBlur: () => setHover(null),
                      };
                      const label = <span className="truncate">{text}</span>;
                      return p.seg.href ? (
                        <Link key={`${p.seg.id}-${i}`} href={p.seg.href} className={className} style={style} {...handlers}>
                          {label}
                        </Link>
                      ) : (
                        <div key={`${p.seg.id}-${i}`} tabIndex={0} className={className} style={style} {...handlers}>
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {rows.idle.length > 0 && (
              <button
                type="button"
                onClick={() => setShowIdle((v) => !v)}
                className="w-full px-4 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {rows.idle.length} boats free all {range === "7" ? "week" : "two weeks"} · {showIdle ? "Hide" : "Show"}
              </button>
            )}
          </div>
        )}

        {hover && (
          <div
            className="pointer-events-none absolute z-20 w-64 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover px-3 py-2.5 text-xs shadow-xl"
            style={{ left: hover.x, top: hover.y - 6 }}
          >
            <p className="text-muted-foreground">{KIND_LABELS[hover.piece.seg.kind]}</p>
            <p className="mt-0.5 font-semibold text-foreground">{hover.piece.seg.label}</p>
            <p className="mt-1 tabular-nums text-foreground/80">
              {formatBoatLocal(hover.piece.seg.start, hover.timezone, "EEE MMM d, h:mm a")} –{" "}
              {formatBoatLocal(
                hover.piece.seg.end,
                hover.timezone,
                formatBoatLocal(hover.piece.seg.start, hover.timezone, "yyyyMMdd") ===
                  formatBoatLocal(hover.piece.seg.end, hover.timezone, "yyyyMMdd")
                  ? "h:mm a"
                  : "EEE MMM d, h:mm a"
              )}
            </p>
            {hover.clash && (
              <p className="mt-1.5 font-medium text-destructive">Overlaps the boat&apos;s calendar: the customer can&apos;t pay.</p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
