"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/shared/components/ui/sidebar";
import { adminThemedSidebarFrame } from "@/shared/admin/admin-header-chrome";
import { ADMIN_NAV_ITEMS, BROKER_NAV_ITEMS } from "@/shared/lib/constants/navigation-data";
import { cn } from "@/shared/lib/utils/general-utils";
import { signOutAndGoHome } from "@/shared/lib/auth/auth-client";
import { LogOut } from "lucide-react";

const navItemButton =
  "h-11 gap-3 rounded-lg px-3 text-base leading-snug text-sidebar-foreground/90 transition-[background-color,box-shadow,color] hover:bg-sidebar-foreground/[0.07] data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:ring-1 data-[active=true]:ring-sidebar-ring/40 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&_.sidebar-label]:hidden";

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Header height matches SidebarInset (`AdminHeader`): h-18 expanded, h-14 when icon-collapsed,
 * box-border so the divider lines up with the main bar.
 */
const SIDEBARS = {
  admin: { title: "KOS Admin", items: ADMIN_NAV_ITEMS },
  broker: { title: "KOS Brokers", items: BROKER_NAV_ITEMS },
};

export default function AdminSidebar({ nav = "admin" }: { nav?: keyof typeof SIDEBARS }) {
  const { title, items } = SIDEBARS[nav];
  const pathname = usePathname();
  const featuredItems = items.filter((item) => item.featured);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={cn(
          "box-border flex h-18 shrink-0 flex-col justify-center gap-0 border-b border-sidebar-border bg-sidebar p-0 transition-[height,padding] duration-200 ease-linear",
          "group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:px-0"
        )}
      >
        <div className="flex w-full items-center gap-2 px-4 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/"
            className={cn(
              "relative flex size-8 shrink-0 items-center justify-center overflow-hidden outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2",
              adminThemedSidebarFrame()
            )}
            aria-label="Home"
          >
            <Image
              src="/icons/logo.png"
              alt=""
              width={28}
              height={28}
              className="size-7 object-contain"
            />
          </Link>
          <div className="min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">
              {title}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 pb-4 pt-5">
        {/* Spotlight group: featured items (the Assistant) sit above the nav
            in their own violet treatment — a "what's this?" moment, not
            another gold row. Its bottom margin equals SidebarContent's top
            padding (20px each) so the button floats with even air above
            and below — SidebarContent's default gap-2 is zeroed so nothing
            else sneaks into the measurement. */}
        {featuredItems.length > 0 ? (
          <SidebarGroup className="mb-5 p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {featuredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={isActive}
                        size="lg"
                        className={cn(
                          "kos-featured-nav relative h-11 gap-3 overflow-hidden rounded-lg px-3 text-base leading-snug",
                          "bg-linear-to-r from-violet-500/15 via-fuchsia-500/10 to-cyan-400/15 text-violet-100",
                          "ring-1 ring-violet-400/30 transition-[box-shadow,background-color] hover:ring-violet-300/60 hover:shadow-[0_0_24px_-8px_rgb(167_139_250)]",
                          "data-[active=true]:from-violet-500/30 data-[active=true]:via-fuchsia-500/20 data-[active=true]:to-cyan-400/25 data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:ring-violet-300/70",
                          "group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&_.sidebar-label]:hidden"
                        )}
                      >
                        <Link
                          href={item.href}
                          className="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                        >
                          <Icon className="kos-featured-icon h-5 w-5 shrink-0 text-fuchsia-300" />
                          <span className="sidebar-label truncate">{item.label}</span>
                          <span className="sidebar-label ml-auto rounded-full bg-fuchsia-500/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-fuchsia-200">
                            New
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.filter((item) => !item.featured).map((item) => {
                const Icon = item.icon;
                const isActive = isNavActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={isActive}
                      size="lg"
                      className={navItemButton}
                    >
                      <Link
                        href={item.href}
                        className="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                      >
                        <Icon
                          className={cn(
                            item.iconClassName || "h-5 w-5 shrink-0 opacity-90",
                            isActive && "opacity-100"
                          )}
                        />
                        <span className="sidebar-label truncate">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-2">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Sign out"
              size="lg"
              className="h-11 rounded-lg px-3 text-base text-destructive/90 transition-colors hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&_.sidebar-label]:hidden"
            >
              <button
                type="button"
                onClick={() => void signOutAndGoHome()}
                className="flex w-full items-center gap-3"
              >
                <LogOut className="h-5 w-5 shrink-0 opacity-90" />
                <span className="sidebar-label">Sign out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
