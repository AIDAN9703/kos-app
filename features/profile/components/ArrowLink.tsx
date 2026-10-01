import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils/general-utils";

interface ArrowLinkProps {
  href: string;
  children: ReactNode;
  /** "back" puts the arrow before the label, pointing left. */
  direction?: "forward" | "back";
  className?: string;
}

/** The flat text link with an arrow used for "View all", card actions and "back" links. */
export function ArrowLink({ href, children, direction = "forward", className }: ArrowLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group/arrow inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary underline-offset-4 hover:underline",
        className
      )}
    >
      {direction === "back" ? (
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover/arrow:-translate-x-0.5" />
      ) : null}
      {children}
      {direction === "forward" ? (
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/arrow:translate-x-0.5" />
      ) : null}
    </Link>
  );
}
