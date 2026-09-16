import {
  Calendar,
  User,
  LayoutDashboard,
  Users,
  UsersRound,
  Ship,
  Newspaper,
  PackagePlus,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// ============================================
// NAVIGATION STRUCTURE
// ============================================

export interface SimpleNavItem {
  href: string;
  label: string;
  type: "link" | "dropdown";
  items?: SimpleNavItem[];
  sections?: { title: string; items: SimpleNavItem[] }[];
  icon?: LucideIcon;
}

export interface NavigationData {
  main: SimpleNavItem[];
  secondary: SimpleNavItem[];
  user: SimpleNavItem[];
}

export const navigationData: NavigationData = {
  main: [
    {
      href: "/explore",
      label: "Explore",
      type: "dropdown",
      sections: [
        {
          title: "Experiences",
          items: [
            {
              href: "/boats/search",
              label: "All Boats",
              type: "link",
            },
            {
              href: "/experiences/term-charters",
              label: "Term Charters",
              type: "link",
            },
            {
              href: "/experiences/fishing",
              label: "Fishing",
              type: "link",
            },
            {
              href: "/experiences/watersports",
              label: "Water Sports",
              type: "link",
            },
            {
              href: "/experiences/sand-bar",
              label: "Sand Bar",
              type: "link",
            },
            {
              href: "/experiences/special-events",
              label: "Special Events",
              type: "link",
            },
            {
              href: "/experiences",
              label: "All Experiences",
              type: "link",
            },
          ],
        },
        {
          title: "Locations",
          items: [
            {
              href: "/boats/search?near=Miami%2C+FL%2C+USA&ne_lat=25.92129499999999&ne_lng=-80.1229&sw_lat=25.7090419531335&sw_lng=-80.31860792381018&zoom_level=13",
              label: "Miami",
              type: "link",
            },
            {
              href: "/boats/search?near=Fort+Lauderdale%2C+FL%2C+USA&ne_lat=26.211927993713&ne_lng=-80.09590395442405&sw_lat=26.07050306928547&sw_lng=-80.20370500560662&zoom_level=13",
              label: "Fort Lauderdale",
              type: "link",
            },
            {
              href: "/boats/search?near=Naples%2C+FL%2C+USA&ne_lat=26.2112380492215&ne_lng=-81.766661003186&sw_lat=26.07891108467754&sw_lng=-81.82036397203399&zoom_level=13",
              label: "Naples",
              type: "link",
            },
            {
              href: "/boats/search?near=West+Palm+Beach%2C+FL%2C+USA&ne_lat=27.27923161620977&ne_lng=-79.74194885822209&sw_lat=26.310840379641395&sw_lng=-80.41348816486271&zoom_level=13&page=1",
              label: "West Palm Beach",
              type: "link",
            },
            {
              href: "/boats/search?near=Connecticut%2C+USA&ne_lat=42.05051096606773&ne_lng=-71.78723902917415&sw_lat=40.95094295977581&sw_lng=-73.7277749818916&zoom_level=13",
              label: "Connecticut",
              type: "link",
            },
            {
              href: "/boats/search?near=The+Bahamas&ne_lat=26.393465781093617&ne_lng=-76.4473427890677&sw_lat=22.4431417432063&sw_lng=-79.1335000156302&zoom_level=13&page=1",
              label: "Bahamas",
              type: "link",
            },
            {
              href: "/boats/search?near=Dominican+Republic&ne_lat=19.9786989016584&ne_lng=-68.2526000505517&sw_lat=17.36110005053662&sw_lng=-72.00750992566606&zoom_level=13",
              label: "Dominican Republic",
              type: "link",
            },
          ],
        },
        {
          title: "Owner Services",
          items: [
            {
              href: "/services/charter-management",
              label: "Charter Management",
              type: "link",
            },
            {
              href: "/services/yacht-management",
              label: "Yacht Management",
              type: "link",
            },
            {
              href: "/services/sales",
              label: "Sales/Purchase",
              type: "link",
            },
            {
              href: "/services/dock-management",
              label: "Dock Management",
              type: "link",
            },
          ],
        },
        {
          title: "Company",
          items: [
            {
              href: "/about-us",
              label: "About Us",
              type: "link",
            },
            {
              href: "/careers",
              label: "Careers",
              type: "link",
            },
            {
              href: "/kos-yacht-club",
              label: "KOS Yacht Club",
              type: "link",
            },
            {
              href: "/news",
              label: "News & Blog",
              type: "link",
            },
            {
              href: "https://kosyachts.myshopify.com/",
              label: "Store",
              type: "link",
            },
            {
              href: "/faq",
              label: "FAQ",
              type: "link",
            },
          ],
        },
      ],
    },
    { href: "/contact", label: "Contact", type: "link" },
  ],

  secondary: [
    { href: "/legal/terms", label: "Terms & Conditions", type: "link" },
    { href: "/legal/privacy", label: "Privacy Policy", type: "link" },
    { href: "/legal/accessibility", label: "Accessibility", type: "link" },
  ],

  user: [
    {
      href: "/profile/bookings",
      label: "My trips",
      type: "link",
      icon: Calendar,
    },
    {
      href: "/profile",
      label: "Profile",
      type: "link",
      icon: User,
    },
  ],
};

// ============================================
// ADMIN NAVIGATION
// ============================================

export interface AdminNavItem {
  label: string;
  href: string;
  iconClassName?: string;
  icon?: LucideIcon;
  /** Rendered in its own spotlight group above the main nav (sidebar only). */
  featured?: boolean;
}

/** Primary admin sidebar + command palette routes (each row has an icon). */
export type AdminMainNavItem = AdminNavItem & { icon: LucideIcon };

export const ADMIN_QUICK_ACTIONS: AdminNavItem[] = [
  {
    label: "Create Boat",
    href: "/admin/boats/create",
    iconClassName: "h-4 w-4 text-blue-400",
  },
  {
    label: "Create Booking",
    // nuqs parseAsBoolean only accepts true/false — "=1" silently no-ops.
    href: "/admin/bookings?newBooking=true",
    iconClassName: "h-4 w-4 text-blue-400",
  },
  {
    label: "Create User",
    href: "/admin/users/create",
    iconClassName: "h-4 w-4 text-purple-400",
  },
  {
    label: "Create Blog Post",
    href: "/admin/blog/create",
    iconClassName: "h-4 w-4 text-light-200",
  },
];

export const ADMIN_NAV_ITEMS: AdminMainNavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    iconClassName: "h-5 w-5",
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    icon: Calendar,
    iconClassName: "h-5 w-5",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    iconClassName: "h-5 w-5",
  },
  {
    label: "Crew",
    href: "/admin/crew",
    icon: UsersRound,
    iconClassName: "h-5 w-5",
  },
  {
    label: "Boats",
    href: "/admin/boats",
    icon: Ship,
    iconClassName: "h-5 w-5",
  },
  {
    label: "Add-ons",
    href: "/admin/add-ons",
    icon: PackagePlus,
    iconClassName: "h-5 w-5",
  },
  {
    label: "Blog Posts",
    href: "/admin/blog",
    icon: Newspaper,
    iconClassName: "h-5 w-5",
  },
  {
    label: "Assistant",
    href: "/admin/assistant",
    icon: Sparkles,
    iconClassName: "h-5 w-5",
    featured: true,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    iconClassName: "h-5 w-5",
  },
];
