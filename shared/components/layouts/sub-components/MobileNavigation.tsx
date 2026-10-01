"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils/general-utils";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { ChevronDown, Menu } from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { NavigationData } from "@/shared/lib/constants/navigation-data";
import { useActiveRoute } from "@/shared/lib/hooks/useActiveRoute";

type MobileNavigationProps = {
  navigationData: Pick<NavigationData, "main">;
  user: Session["user"] | undefined | null;
};

const MobileNavigation: React.FC<MobileNavigationProps> = ({ navigationData, user }) => {
  const [open, setOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { isActive } = useActiveRoute();
  const pathname = usePathname();

  // Close the sheet when the route changes (reset during render, no effect).
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  const toggleExpanded = useCallback((href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((i) => i !== href) : [...prev, href]
    );
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="text-primary hover:text-primary/80 transition-colors lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 shrink-0" strokeWidth={2} />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full max-w-sm p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Image
                src="/icons/transparent-logo.png"
                alt="Logo"
                width={48}
                height={48}
                className="rounded-full filter-blue"
              />
              <div className="flex-1 min-w-0">
                {user ? (
                  <>
                    <p className="text-base font-semibold text-primary truncate">
                      {user.name || "User"}
                    </p>
                    {user.email && (
                      <p className="text-base text-muted-foreground truncate">{user.email}</p>
                    )}
                  </>
                ) : (
                  <p className="text-base font-semibold text-primary">Welcome to KOS</p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {navigationData.main.map((item) => (
                <div key={item.href}>
                  {item.type === "dropdown" && (item.items || item.sections) ? (
                    <>
                      <button
                        onClick={() => toggleExpanded(item.href)}
                        className={cn(
                          "flex items-center justify-between w-full px-4 py-3 text-base font-semibold text-primary rounded-lg transition-colors",
                          expandedItems.includes(item.href) ? "bg-primary/5" : "hover:bg-gray-50"
                        )}
                      >
                        <span>{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            expandedItems.includes(item.href) && "rotate-180"
                          )}
                        />
                      </button>

                      {expandedItems.includes(item.href) && (
                        <div className="mt-2 ml-4 space-y-2 border-l-2 border-primary/10 pl-4">
                          {/* Sections */}
                          {item.sections?.map((section, sectionIndex) => (
                            <div key={`section-${sectionIndex}`} className="mb-4">
                              <h4 className="text-base font-semibold text-primary uppercase tracking-wider mb-2">
                                {section.title}
                              </h4>
                              <div className="space-y-1">
                                {section.items.map((subItem) => (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    target={subItem.href.startsWith("http") ? "_blank" : undefined}
                                    rel={
                                      subItem.href.startsWith("http")
                                        ? "noopener noreferrer"
                                        : undefined
                                    }
                                    className={cn(
                                      "block px-3 py-2.5 text-base font-normal rounded-lg transition-colors",
                                      isActive(subItem.href, false)
                                        ? "text-primary font-semibold bg-primary/5"
                                        : "text-muted-foreground hover:text-primary hover:bg-gray-50"
                                    )}
                                  >
                                    {subItem.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Flat items */}
                          {item.items?.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                "block px-3 py-2.5 text-base font-normal rounded-lg transition-colors",
                                isActive(subItem.href, false)
                                  ? "text-primary font-semibold bg-primary/5"
                                  : "text-muted-foreground hover:text-primary hover:bg-gray-50"
                              )}
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "block px-4 py-3 text-base font-semibold rounded-lg transition-colors",
                        isActive(item.href, true)
                          ? "text-primary bg-primary/5"
                          : "text-primary hover:bg-gray-50"
                      )}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            {user ? (
              <Button
                onClick={() => signOut()}
                variant="outline"
                className="w-full h-12 text-base font-semibold text-primary hover:text-primary"
              >
                Sign out
              </Button>
            ) : (
              <SheetClose asChild>
                <Button
                  asChild
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white"
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </SheetClose>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigation;
