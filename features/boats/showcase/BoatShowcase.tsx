"use client";

import { useState } from "react";
import Link from "next/link";
import { Image as IKImage } from "@imagekit/next";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CalendarDays, ExternalLink, Pencil, Ship, Zap } from "lucide-react";
import type { BoatDetail } from "@/features/boats/boat.types";
import type { BoatShowcaseData, ShowcaseKind } from "@/features/boats/showcase/boat-showcase.types";
import { GlassHeader, GlassPage, GlassPanel, GlassStat } from "@/shared/admin/components/glass";
import { BoatActionsMenu } from "./BoatActionsMenu";
import { Button } from "@/shared/components/ui/button";
import { getImageKitProps } from "@/shared/lib/utils/imagekit";
import { formatBoatLocal } from "@/shared/lib/utils/date-helpers";
import { formatCentsCompact } from "@/shared/lib/utils/money-utils";
import { cn } from "@/shared/lib/utils/general-utils";

const KIND: Record<ShowcaseKind, { label: string; chip: string }> = {
  booked: { label: "Booked", chip: "bg-primary/20 text-primary" },
  proposed: { label: "Proposal", chip: "bg-info/15 text-info" },
  external: { label: "Imported", chip: "bg-glass-strong text-foreground/70" },
  block: { label: "Blocked", chip: "bg-destructive/15 text-destructive" },
};

const CATEGORY: Record<string, string> = {
  PONTOON: "Pontoon",
  YACHT: "Yacht",
  SAILBOAT: "Sailboat",
  FISHING: "Fishing",
  SPEEDBOAT: "Speedboat",
  HOUSEBOAT: "Houseboat",
  JET_SKI: "Jet ski",
  OTHER: "Boat",
};

function Photo({ url, context, className, alt = "" }: { url: string; context: "hero" | "thumb"; className?: string; alt?: string }) {
  const props = getImageKitProps(url, context);
  return (
    <IKImage
      src={props.src}
      alt={alt}
      width={props.width}
      height={props.height}
      sizes={context === "thumb" ? "120px" : "(max-width: 1024px) 100vw, 60vw"}
      transformation={props.transformation}
      className={cn("object-cover", className)}
    />
  );
}

function Spark({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${30 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className={cn("h-8 w-full overflow-visible", className)}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** The "booked this month" dial. */
function Dial({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--glass-strong)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className="drop-shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_60%,transparent)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-foreground">{pct}%</span>
        <span className="text-[11px] text-muted-foreground">booked this month</span>
      </div>
    </div>
  );
}

export function BoatShowcase({
  boat,
  data,
  fromHourly,
}: {
  boat: BoatDetail;
  data: BoatShowcaseData;
  fromHourly: number | null;
}) {
  const photos = [boat.mainImage, ...(boat.galleryImages ?? [])].filter((p): p is string => Boolean(p));
  const [active, setActive] = useState(0);
  const hero = photos[active] ?? null;
  const title = boat.displayTitle || boat.name;
  const next = data.upcoming.find((u) => u.kind === "booked") ?? null;
  const thisMonth = data.months[data.months.length - 1];

  const specs: [string, string | null][] = [
    ["Type", CATEGORY[boat.category ?? "OTHER"] ?? "Boat"],
    ["Make & model", [boat.make, boat.model].filter(Boolean).join(" ") || null],
    ["Year", boat.yearBuilt ? String(boat.yearBuilt) : null],
    ["Length", boat.lengthFt ? `${boat.lengthFt} ft` : null],
    ["Guests", boat.capacity ? `Up to ${boat.capacity}` : null],
    ["Sleeps", boat.sleeps ? String(boat.sleeps) : null],
    ["Bathrooms", boat.bathrooms ? String(boat.bathrooms) : null],
    ["Crew", boat.crewIncluded ? "Included" : boat.crewRequired ? "Required" : "Not needed"],
    ["Turnaround", `${boat.turnaroundMinutes} min`],
    ["Owner", [boat.ownerFirstName, boat.ownerLastName].filter(Boolean).join(" ") || null],
  ];

  // Dot grid: 18 columns (weeks) × 7 rows (Mon–Sun).
  const weeks = Array.from({ length: 18 }, (_, w) => data.days.slice(w * 7, w * 7 + 7));
  const todayKey = data.days.find((d) => d.future)?.key;
  const dot = (hours: number) =>
    hours <= 0 ? "bg-glass-strong" : hours < 4 ? "bg-primary/45" : hours < 8 ? "bg-primary/75" : "bg-primary shadow-[0_0_8px_var(--primary)]";
  const ytdMonths = data.months.slice(-Math.max(1, new Date().getMonth() + 1));

  return (
    <GlassPage backdrop={photos[0]} compact>
      <GlassHeader
        back="/admin/boats"
        title={title}
        meta={
          <>
            <span className={cn("rounded-full px-2.5 py-0.5 font-medium", boat.active ? "bg-success/15 text-success" : "bg-glass-strong text-muted-foreground")}>
              {boat.active ? "Listed" : "Hidden"}
            </span>
            {boat.instantBook && (
              <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 font-medium text-primary">
                <Zap className="size-3" /> Instant Book
              </span>
            )}
            {boat.locationLabel && <span>{boat.locationLabel}</span>}
          </>
        }
        actions={
          <>
            <Button asChild variant="glass" className="h-9 px-4">
              <a href={`/boats/${boat.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" /> View on site
              </a>
            </Button>
            <Button asChild variant="glass" className="h-9 px-4">
              <Link href={`/admin/boats/${boat.id}/calendar`}>
                <CalendarDays className="size-3.5" /> Calendar
              </Link>
            </Button>
            <Button asChild className="h-9 rounded-full px-4 font-semibold">
              <Link href={`/admin/boats/${boat.id}/edit`}>
                <Pencil className="size-3.5" /> Edit
              </Link>
            </Button>
            <BoatActionsMenu boatId={boat.id} name={title} />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)_300px]">
        {/* Specs + dial */}
        <GlassPanel title="Specs" className="order-2 gap-4 xl:order-1">
          <dl className="divide-y divide-glass-border text-[13px]">
            {specs
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate text-right font-medium text-foreground">{v}</dd>
                </div>
              ))}
          </dl>
          <div className="mt-auto pt-2">
            <Dial pct={data.kpis.utilizationPct} />
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {[`${thisMonth?.hours ?? 0} h booked`, `${thisMonth?.trips ?? 0} trips`, "8 AM–8 PM days"].map((t) => (
                <span key={t} className="rounded-full bg-glass-strong px-2.5 py-1 text-[11px] text-foreground/80">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* Hero */}
        <GlassPanel className="relative order-1 min-h-[360px] overflow-hidden p-0 xl:order-2 xl:min-h-[520px]">
          {hero ? (
            <Photo url={hero} context="hero" alt={title} className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
              <Ship className="size-16" />
            </div>
          )}
          <div aria-hidden className="absolute inset-0 bg-linear-to-b from-dark-bg/35 via-transparent via-55% to-dark-bg/85" />

          {next && <GlassStat label="Next trip" value={formatBoatLocal(next.start, boat.timezone, "EEE MMM d · h:mm a")} className="absolute left-4 top-4" />}

          <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {fromHourly ? <GlassStat label="From" value={`${formatCentsCompact(Math.round(fromHourly * 100))}/hr`} /> : null}
              {boat.capacity ? <GlassStat label="Guests" value={`Up to ${boat.capacity}`} /> : null}
              {boat.lengthFt ? <GlassStat label="Length" value={`${boat.lengthFt} ft`} /> : null}
            </div>
            {photos.length > 1 && (
              <div className="glass-chip flex gap-1.5 p-1.5 backdrop-blur-xl">
                {photos.slice(0, 6).map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show photo ${i + 1}`}
                    className={cn("relative size-11 overflow-hidden rounded-xl ring-2 transition", i === active ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100")}
                  >
                    <Photo url={p} context="thumb" className="absolute inset-0 h-full w-full" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </GlassPanel>

        {/* Next up + rates */}
        <GlassPanel title="Next on the calendar" aside={<span className="text-[11px] text-muted-foreground">45 days</span>} className="order-3">
          {data.upcoming.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nothing booked, proposed or blocked.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcoming.map((u) => {
                const row = (
                  <>
                    <div className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-glass-inset py-1.5">
                      <span className="text-[10px] uppercase text-muted-foreground">{formatBoatLocal(u.start, boat.timezone, "MMM")}</span>
                      <span className="text-base font-semibold leading-tight tabular-nums text-foreground">{formatBoatLocal(u.start, boat.timezone, "d")}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{u.label}</p>
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        {formatBoatLocal(u.start, boat.timezone, "EEE h:mm a")} – {formatBoatLocal(u.end, boat.timezone, "h:mm a")}
                      </p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", KIND[u.kind].chip)}>{KIND[u.kind].label}</span>
                  </>
                );
                const cls = "flex items-center gap-3 rounded-2xl border border-glass-border bg-glass-inset p-2 transition-colors";
                return (
                  <li key={`${u.kind}-${u.id}`}>
                    {u.href ? (
                      <Link href={u.href} className={cn(cls, "hover:bg-glass-strong")}>
                        {row}
                      </Link>
                    ) : (
                      <div className={cls}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {boat.pricingTiers.length > 0 && (
            <div className="mt-auto border-t border-glass-border pt-3">
              <h3 className="text-[13px] font-semibold tracking-tight text-foreground">Rates</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                {[...boat.pricingTiers]
                  .sort((a, b) => a.hours - b.hours)
                  .slice(0, 6)
                  .map((t) => (
                    <div key={t.id} className="rounded-xl bg-glass-inset px-3 py-2">
                      <dt className="text-[11px] text-muted-foreground">{t.hours} hours</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">{formatCentsCompact(Math.round(t.price * 100))}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
        <GlassPanel
          title="Booking calendar"
          aside={
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-2 rounded-full bg-glass-strong" />
              <span className="size-2 rounded-full bg-primary/45" />
              <span className="size-2 rounded-full bg-primary/75" />
              <span className="size-2 rounded-full bg-primary" /> hours
            </span>
          }
        >
          <div className="mt-1 flex gap-[5px]">
            {weeks.map((week, w) => (
              <div key={w} className="flex flex-1 flex-col gap-[5px]">
                {week.map((d) => (
                  <span
                    key={d.key}
                    title={`${d.key}: ${d.hours ? `${d.hours} h booked` : d.proposed ? "proposal" : "free"}`}
                    className={cn(
                      "aspect-square w-full rounded-full",
                      dot(d.hours),
                      d.proposed && d.hours === 0 && "bg-transparent ring-1 ring-inset ring-info/70",
                      d.future && d.hours === 0 && !d.proposed && "bg-glass-inset",
                      d.key === todayKey && "ring-2 ring-foreground/80"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>13 weeks ago</span>
            <span>today</span>
            <span>+5 weeks</span>
          </div>
        </GlassPanel>

        <GlassPanel
          title="Revenue by month"
          aside={<span className="text-[11px] tabular-nums text-muted-foreground">{formatCentsCompact(data.kpis.gmvYtdCents)} this year</span>}
        >
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.months} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} interval={0} />
                <Tooltip
                  cursor={{ fill: "var(--glass-inset)" }}
                  content={({ active: isActive, payload }) => {
                    const m = payload?.[0]?.payload as BoatShowcaseData["months"][number] | undefined;
                    if (!isActive || !m) return null;
                    return (
                      <div className="glass-chip px-3 py-2 text-xs text-foreground backdrop-blur-xl">
                        <p className="font-semibold">{m.label}</p>
                        <p className="tabular-nums text-foreground/80">
                          {formatCentsCompact(m.gmvCents)} · {m.trips} trips · {m.hours} h
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="gmvCents" radius={[6, 6, 2, 2]} maxBarSize={22}>
                  {data.months.map((m, i) => (
                    <Cell key={m.key} fill={i === data.months.length - 1 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel title="Overview">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {[
              { label: "Trips this year", value: data.kpis.tripsYtd.toLocaleString(), series: ytdMonths.map((m) => m.trips) },
              { label: "Booked hours, 90 days", value: data.kpis.hours90.toLocaleString(), series: data.months.slice(-3).map((m) => m.hours) },
              { label: "Revenue this year", value: formatCentsCompact(data.kpis.gmvYtdCents), series: ytdMonths.map((m) => m.gmvCents) },
              { label: "Average trip", value: formatCentsCompact(data.kpis.avgTripCents), series: ytdMonths.map((m) => (m.trips ? m.gmvCents / m.trips : 0)) },
            ].map((k) => (
              <div key={k.label} className="min-w-0">
                <p className="truncate text-[11px] text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{k.value}</p>
                <Spark values={k.series.length > 1 ? k.series : [0, ...k.series]} className="mt-1 text-primary" />
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </GlassPage>
  );
}
