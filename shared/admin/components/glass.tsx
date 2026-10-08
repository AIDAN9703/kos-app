import type { ReactNode } from "react";
import Image from "next/image";
import { Image as IKImage } from "@imagekit/next";
import { getImageKitProps } from "@/shared/lib/utils/imagekit";
import { cn } from "@/shared/lib/utils/general-utils";

/**
 * The admin's glass look: frosted panels on the admin canvas, or over a
 * page's own photo, blurred and veiled. Colors come from the theme tokens
 * (--glass*, see globals.css), so the same pieces work in either theme.
 *
 *   <GlassPage backdrop={boat.mainImage} compact>
 *     <GlassHeader title="…" meta={…} actions={…} />
 *     <GlassPanel title="Specs">…</GlassPanel>
 *   </GlassPage>
 */

function Backdrop({ src }: { src: string }) {
  const className = "absolute inset-0 h-full w-full scale-110 object-cover blur-2xl saturate-125";
  if (src.includes("ik.imagekit.io/")) {
    const props = getImageKitProps(src, "secondary");
    return (
      <IKImage
        src={props.src}
        alt=""
        width={props.width}
        height={props.height}
        sizes="100vw"
        transformation={props.transformation}
        className={className}
      />
    );
  }
  return <Image src={src} alt="" fill sizes="640px" className={className} />;
}

/**
 * The page shell. With a `backdrop` photo, the photo (blurred and veiled) is
 * the page background edge to edge; without one the page sits on the plain
 * admin canvas. It bleeds over the page area's padding (AdminShell: px-4
 * py-4 md:px-6 md:py-6 xl:px-12) to the screen's edges and sets its own:
 * roomier, with a max width of 84rem, for detail pages; `compact` puts the
 * same padding back at the top bar's max width, 1680px (list pages, the
 * dashboard, the boat page). Fixed caps: a big monitor or a zoomed-out
 * browser gets margins, not stretched-out content.
 *
 * By default it grows with its content so the page scrolls. `fill` makes it
 * exactly the page area's height instead, for list pages whose table scrolls
 * inside (see AdminListShell). overflow-clip, not hidden: it trims the
 * blurred photo without trapping the scroll.
 *
 * Inside it, the theme's border and muted colors become their glass
 * versions, so existing components (rows, chips, hovers) turn translucent
 * on their own. Menus and dialogs render outside it and stay solid.
 */
export function GlassPage({
  backdrop,
  compact = false,
  fill = false,
  children,
  className,
}: {
  /** A photo URL (ImageKit or a local /images path). */
  backdrop?: string | null;
  compact?: boolean;
  fill?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate -mx-4 -my-4 flex flex-col overflow-clip md:-mx-6 md:-my-6 xl:-mx-12",
        fill ? "min-h-0 flex-1" : "shrink-0 grow",
        compact ? "px-4 py-4 md:px-6 md:py-6 xl:px-12" : "px-4 py-6 md:px-10 md:py-9 xl:px-14 xl:py-10",
        "[--border:var(--glass-border)] [--muted:var(--glass-inset)]",
        className
      )}
    >
      {backdrop ? (
        <div aria-hidden className="absolute inset-0 -z-10">
          <Backdrop src={backdrop} />
          <div className="absolute inset-0 [background:var(--glass-veil)]" />
        </div>
      ) : null}
      <div
        className={cn(
          "mx-auto w-full",
          compact ? "max-w-[1680px]" : "max-w-[84rem]",
          fill && "flex min-h-0 flex-1 flex-col"
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Title row: optional leading visual (an avatar or photo), an eyebrow above the title, a meta line under it, actions on the right. */
export function GlassHeader({
  leading,
  eyebrow,
  title,
  meta,
  actions,
}: {
  leading?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center gap-4">
      {leading}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">{eyebrow}</p>
        ) : null}
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {meta ? <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A frosted card. Pass className="p-0" for edge-to-edge content like a photo. */
export function GlassPanel({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-panel flex min-w-0 flex-col gap-3 p-5", className)}>
      {title || aside ? (
        <div className="flex items-center justify-between gap-3">
          {title ? <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A label + value chip, for stats laid over photos or in a row. `lg` for headline numbers. */
export function GlassStat({
  label,
  value,
  size = "sm",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-chip backdrop-blur-xl",
        size === "lg" ? "flex flex-col justify-between px-4 py-3" : "px-3.5 py-2",
        className
      )}
    >
      {/* Headline labels wrap on narrow screens rather than cut off. */}
      <p className={cn("text-muted-foreground", size === "lg" ? "text-xs leading-snug" : "truncate text-[11px]")}>{label}</p>
      <p
        className={cn(
          "font-semibold tabular-nums text-foreground",
          size === "lg" ? "mt-1 text-xl leading-tight tracking-tight" : "text-sm"
        )}
      >
        {value}
      </p>
    </div>
  );
}
