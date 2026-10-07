import {
  parseArrayParam,
  parseNumberParam,
  parseStringParam,
} from "@/shared/lib/utils/search-params-utils";

type ActiveFilterTag = {
  id: string;
  label: string;
  /** URL param keys to clear when this tag is removed */
  keys: string[];
};

const FEATURE_LABELS: Record<string, string> = {
  wifi: "WiFi",
  airConditioning: "Air conditioning",
  kitchen: "Kitchen",
  shower: "Shower",
  bluetooth: "Bluetooth",
  usb: "USB charging",
  waterToys: "Water toys",
  fishingGear: "Fishing gear",
  snorkelingGear: "Snorkeling gear",
  paddleBoard: "Paddle board",
  jetSki: "Jet ski",
  bbq: "BBQ grill",
};

const formatCategory = (slug: string) =>
  slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const formatMoney = (n: number) => `$${n.toLocaleString()}`;

export function getActiveFilterTags(
  searchParams: URLSearchParams,
): ActiveFilterTag[] {
  const tags: ActiveFilterTag[] = [];

  const minPrice = parseNumberParam(searchParams.get("minPrice"));
  const maxPrice = parseNumberParam(searchParams.get("maxPrice"));
  if (minPrice != null || maxPrice != null) {
    const label =
      minPrice != null && maxPrice != null
        ? `${formatMoney(minPrice)} – ${formatMoney(maxPrice)}`
        : minPrice != null
          ? `From ${formatMoney(minPrice)}`
          : `Up to ${formatMoney(maxPrice!)}`;
    tags.push({ id: "price", label, keys: ["minPrice", "maxPrice"] });
  }

  const minLength = parseNumberParam(searchParams.get("minLength"));
  const maxLength = parseNumberParam(searchParams.get("maxLength"));
  if (minLength != null || maxLength != null) {
    const label =
      minLength != null && maxLength != null
        ? `${minLength}–${maxLength} ft`
        : minLength != null
          ? `${minLength}+ ft`
          : `Up to ${maxLength} ft`;
    tags.push({ id: "length", label, keys: ["minLength", "maxLength"] });
  }

  const minYear = parseNumberParam(searchParams.get("minYear"));
  const maxYear = parseNumberParam(searchParams.get("maxYear"));
  if (minYear != null || maxYear != null) {
    const label =
      minYear != null && maxYear != null
        ? `Built ${minYear}–${maxYear}`
        : minYear != null
          ? `Built ${minYear}+`
          : `Built before ${maxYear}`;
    tags.push({ id: "year", label, keys: ["minYear", "maxYear"] });
  }

  const passengers = parseNumberParam(searchParams.get("passengers"));
  if (passengers != null && passengers > 1) {
    tags.push({
      id: "passengers",
      label: `${passengers}+ guests`,
      keys: ["passengers"],
    });
  }

  const cabins = parseNumberParam(searchParams.get("cabins"));
  if (cabins != null && cabins > 0) {
    tags.push({
      id: "cabins",
      label: cabins === 1 ? "1+ cabin" : `${cabins}+ cabins`,
      keys: ["cabins"],
    });
  }

  const bathrooms = parseNumberParam(searchParams.get("bathrooms"));
  if (bathrooms != null && bathrooms > 0) {
    tags.push({
      id: "bathrooms",
      label: bathrooms === 1 ? "1+ bathroom" : `${bathrooms}+ bathrooms`,
      keys: ["bathrooms"],
    });
  }

  for (const category of parseArrayParam(searchParams.get("category"))) {
    tags.push({
      id: `category-${category}`,
      label: formatCategory(category),
      keys: ["category"],
    });
  }

  for (const feature of parseArrayParam(searchParams.get("features"))) {
    tags.push({
      id: `feature-${feature}`,
      label: FEATURE_LABELS[feature] ?? formatCategory(feature),
      keys: ["features"],
    });
  }

  const near = parseStringParam(searchParams.get("near"));
  if (near) {
    tags.push({ id: "near", label: near, keys: ["near"] });
  }

  return tags;
}

/** Remove one filter tag from the current URL params (features/categories need special handling). */
export function removeFilterTag(
  searchParams: URLSearchParams,
  tag: ActiveFilterTag,
): Record<string, string | null> {
  const updates: Record<string, string | null> = { page: "1" };

  if (tag.id.startsWith("category-")) {
    const slug = tag.id.replace("category-", "");
    const remaining = parseArrayParam(searchParams.get("category")).filter(
      (c) => c !== slug,
    );
    updates.category = remaining.length > 0 ? remaining.join(",") : null;
    return updates;
  }

  if (tag.id.startsWith("feature-")) {
    const slug = tag.id.replace("feature-", "");
    const remaining = parseArrayParam(searchParams.get("features")).filter(
      (f) => f !== slug,
    );
    updates.features = remaining.length > 0 ? remaining.join(",") : null;
    return updates;
  }

  for (const key of tag.keys) {
    updates[key] = null;
  }

  return updates;
}

export function countActiveFilters(searchParams: URLSearchParams): number {
  let count = 0;
  if (searchParams.has("minPrice") || searchParams.has("maxPrice")) count++;
  if (searchParams.has("minLength") || searchParams.has("maxLength")) count++;
  if (searchParams.has("minYear") || searchParams.has("maxYear")) count++;
  if (
    searchParams.has("passengers") &&
    (parseNumberParam(searchParams.get("passengers")) ?? 1) > 1
  )
    count++;
  if (
    searchParams.has("cabins") &&
    (parseNumberParam(searchParams.get("cabins")) ?? 0) > 0
  )
    count++;
  if (
    searchParams.has("bathrooms") &&
    (parseNumberParam(searchParams.get("bathrooms")) ?? 0) > 0
  )
    count++;
  if (searchParams.has("category")) count++;
  if (searchParams.has("features")) count++;
  return count;
}
