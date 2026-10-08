"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { circleClass } from "@/shared/admin/components/top-nav/controls";

/** The bits of the browser's Navigation API used here (TypeScript's DOM types don't have it yet). */
type BrowserNavigation = { currentEntry: { index: number } | null; entries(): { url: string | null }[] };

/** The previous page in this tab, when the browser can say (the Navigation API). */
function previousPath(): string | null {
  const navigation = (window as Window & { navigation?: BrowserNavigation }).navigation;
  const index = navigation?.currentEntry?.index ?? 0;
  const url = index > 0 ? navigation?.entries()[index - 1]?.url : null;
  return url ? new URL(url).pathname : null;
}

/**
 * The back arrow on a page you click into. It goes back to where you came
 * from: the list with its filters, page and scroll as you left them, the
 * dashboard, another deal. It's a link to the page above (`href`, e.g. the
 * bookings list), which it follows when there's nothing in this portal to
 * go back to: the page opened in a new tab, from an email, or right after
 * signing in.
 */
export function BackButton({ href }: { href: string }) {
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // ⌘/Ctrl/Shift-click and middle-click open the page above, as links do.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const portal = `/${href.split("/")[1]}`;
    const previous = previousPath();
    if (previous && previous !== window.location.pathname && (previous === portal || previous.startsWith(`${portal}/`))) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link href={href} onClick={onClick} aria-label="Back" title="Back" className={circleClass}>
      <ArrowLeft />
    </Link>
  );
}
