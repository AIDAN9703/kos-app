"use client";

import React from "react";
import Link from "next/link";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cn } from "@/shared/lib/utils/general-utils";
import { NavigationData } from "@/shared/lib/constants/navigation-data";
import { useActiveRoute } from "@/shared/lib/hooks/useActiveRoute";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/shared/components/ui/navigation-menu";

interface DesktopNavigationProps {
  navigationData: Pick<NavigationData, "main">;
}

const DesktopNavigation: React.FC<DesktopNavigationProps> = ({ navigationData }) => {
  const { isActive } = useActiveRoute();

  return (
    <div className="hidden lg:flex items-center gap-5">
      <NavigationMenuPrimitive.Root className="relative z-10 flex max-w-max flex-1 items-center justify-center">
        <NavigationMenuList className="gap-2">
          {navigationData.main.map((item) => (
            <NavigationMenuItem key={item.href} className="relative">
              {item.type === "dropdown" && (item.items || item.sections) ? (
                <>
                  <NavigationMenuTrigger className="text-base font-semibold text-primary data-[state=open]:bg-transparent data-[active]:bg-transparent hover:bg-transparent focus:bg-transparent h-auto py-0 px-0 bg-transparent">
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="right-0 left-auto">
                    {/* Same structural language as the rest of the site:
                        rounded-2xl surface, small-caps column labels, hairline
                        dividers between columns, quiet hover rows. */}
                    <div
                      style={{ width: 780, maxWidth: "95vw" }}
                      className="grid grid-cols-4 rounded-2xl border border-border/60 bg-white p-6 shadow-xl"
                    >
                      {item.sections?.map((section, sectionIndex) => (
                        <div
                          key={section.title}
                          className={cn(
                            "min-w-0 px-5 first:pl-0 last:pr-0",
                            sectionIndex > 0 && "border-l border-border/50"
                          )}
                        >
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {section.title}
                          </h3>
                          <ul className="mt-3 space-y-0.5">
                            {section.items.map((subItem) => (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  target={subItem.href.startsWith("http") ? "_blank" : undefined}
                                  rel={
                                    subItem.href.startsWith("http")
                                      ? "noopener noreferrer"
                                      : undefined
                                  }
                                  className="-mx-2 block whitespace-nowrap rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-muted/60 hover:text-primary"
                                >
                                  {subItem.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {item.items?.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="-mx-2 block whitespace-nowrap rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-muted/60 hover:text-primary"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink
                  href={item.href}
                  aria-current={isActive(item.href, true) ? "page" : undefined}
                  className="text-base font-semibold text-primary transition-colors hover:text-primary py-2"
                >
                  {item.label}
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
        {/* No Viewport — content renders in-place inside NavigationMenuItem,
            positioned via md:absolute from NavigationMenuContent base styles.
            This avoids the overflow-hidden + CSS variable measurement cycle
            that was forcing the dropdown to collapse at any width other than 1024px. */}
      </NavigationMenuPrimitive.Root>
    </div>
  );
};

export default DesktopNavigation;
