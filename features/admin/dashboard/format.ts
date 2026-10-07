/** "now", "12m", "3h", "5d" — elapsed time, compact. */
export function elapsed(from: Date, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - from.getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** 1 → "1 trip", 3 → "3 trips". */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
