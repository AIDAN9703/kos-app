/** Three-up hairline stats used at the top of the owner and captain dashboards. */
export function StatStrip({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col-reverse px-4 py-4 first:pl-0 last:pr-0 sm:px-6"
        >
          <dt className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {stat.label}
          </dt>
          <dd className="text-2xl font-bold tabular-nums text-primary sm:text-3xl">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
