import {
  BookUser,
  CircleDot,
  FileText,
  Handshake,
  LayoutDashboard,
  Route as RouteIcon,
  Truck,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { PATHS, SECTIONS, SECTION_REDIRECTS } from "@/lib/route-paths";

// Re-exported so the rest of the app has a single import site for routing,
// even though the raw path data lives in the dependency-free module that
// next.config.ts can safely load.
export {
  PATHS,
  SECTIONS,
  LEGACY_REDIRECTS,
  SECTION_REDIRECTS,
} from "@/lib/route-paths";

/**
 * The one source of truth for every route in the app.
 *
 * ## Why this file exists
 *
 * Paths used to be written as string literals in four unrelated places — the
 * sidebar (`lib/nav.ts`), the quick-add menu, `<Link href>` across ~20
 * components, and `revalidatePath()` inside every Server Action. Nothing tied
 * them together, so a path change silently broke cache invalidation while the
 * links kept working: the most expensive kind of bug, because nothing errors,
 * the data just quietly stops refreshing.
 *
 * Everything now derives from `PATHS` below:
 *   · sidebar groups        → `NAV_GROUPS`
 *   · quick-add menu        → `QUICK_ADD`
 *   · command palette       → `ALL_DESTINATIONS`
 *   · cache invalidation    → `revalidateFor()` in lib/revalidate.ts
 *   · breadcrumbs / titles  → `findDestination()`
 *
 * ## URL shape
 *
 * Sections are real path segments (`/operations/routes`, `/ledgers/parties`)
 * so the URL matches the sidebar grouping. Dashboard and Reports stay at the
 * root: they *are* the overview, and nesting them under `/overview` would add a
 * segment that carries no information.
 *
 * "Ledgers" rather than "money" or "people": all four of those pages are a
 * balance plus a transaction history, which is precisely what a ledger is.
 * Drivers belongs there because the page is a peshgi ledger, not a staff
 * directory.
 */



export interface Destination {
  /** Stable key — also the search keyword in the command palette. */
  key: string;
  title: string;
  href: string;
  icon: LucideIcon;
  /** Extra terms the command palette should match on. */
  keywords?: string[];
  /** Whether the quick-add menu offers a "new" action for this. */
  creatable?: boolean;
}

export interface NavGroup {
  label: string;
  /** Path prefix shared by the group's items, or null for root-level items. */
  prefix: string | null;
  items: Destination[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    prefix: null,
    items: [
      {
        key: "dashboard",
        title: "Dashboard",
        href: PATHS.dashboard,
        icon: LayoutDashboard,
        keywords: ["home", "overview", "profit"],
      },
      {
        key: "reports",
        title: "Reports",
        href: PATHS.reports,
        icon: FileText,
        keywords: ["print", "summary", "statement"],
      },
    ],
  },
  {
    label: "Operations",
    prefix: SECTIONS.operations,
    items: [
      {
        key: "vehicles",
        title: "Vehicles",
        href: PATHS.vehicles,
        icon: Truck,
        keywords: ["truck", "fleet", "plate"],
        creatable: true,
      },
      {
        key: "routes",
        title: "Routes",
        href: PATHS.routes,
        icon: RouteIcon,
        keywords: ["trip", "leg", "freight", "expense", "diesel"],
        creatable: true,
      },
      {
        key: "maintenance",
        title: "Maintenance",
        href: PATHS.maintenance,
        icon: Wrench,
        keywords: ["repair", "mechanic", "service", "workshop"],
        creatable: true,
      },
      {
        key: "tyres",
        title: "Tyres",
        href: PATHS.tyres,
        icon: CircleDot,
        keywords: ["tire", "retread", "km life"],
        creatable: true,
      },
    ],
  },
  {
    label: "Ledgers",
    prefix: SECTIONS.ledgers,
    items: [
      {
        key: "parties",
        title: "Parties",
        href: PATHS.parties,
        icon: Users,
        keywords: ["client", "customer", "consignor", "udhaar", "receivable"],
        creatable: true,
      },
      {
        key: "brokers",
        title: "Brokers",
        href: PATHS.brokers,
        icon: Handshake,
        keywords: ["adda", "agent", "commission", "settlement"],
        creatable: true,
      },
      {
        key: "khata",
        title: "Khata",
        href: PATHS.khata,
        icon: BookUser,
        keywords: ["lending", "borrow", "gave", "got"],
        creatable: true,
      },
      {
        key: "drivers",
        title: "Drivers",
        href: PATHS.drivers,
        icon: UserCog,
        keywords: ["peshgi", "advance", "staff", "driver"],
        creatable: true,
      },
    ],
  },
];

/** Flat list of every navigable destination. */
export const ALL_DESTINATIONS: Destination[] = NAV_GROUPS.flatMap(
  (g) => g.items,
);

/** Destinations the quick-add menu can create into, in menu order. */
export const QUICK_ADD: Destination[] = ALL_DESTINATIONS.filter(
  (d) => d.creatable,
);

/**
 * The destination matching a pathname, preferring the longest match so
 * `/operations/routes/abc` resolves to Routes rather than to nothing.
 */
export function findDestination(pathname: string): Destination | undefined {
  return ALL_DESTINATIONS.filter(
    (d) => pathname === d.href || pathname.startsWith(`${d.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

/** The nav group a pathname belongs to, for sidebar auto-expansion. */
export function findGroup(pathname: string): NavGroup | undefined {
  return NAV_GROUPS.find((g) =>
    g.items.some(
      (d) => pathname === d.href || pathname.startsWith(`${d.href}/`),
    ),
  );
}

/**
 * SECTION_REDIRECTS lives in the dependency-free module, so it can't be derived
 * from NAV_GROUPS directly. This asserts the two agree, in development only —
 * a silent mismatch would mean /operations redirects somewhere that is no
 * longer that section's first item.
 */
if (process.env.NODE_ENV !== "production") {
  for (const group of NAV_GROUPS) {
    if (!group.prefix) continue;
    const first = group.items[0];
    const declared = SECTION_REDIRECTS.find((r) => r.from === group.prefix);
    if (first && declared && declared.to !== first.href) {
      console.warn(
        `[routes] Section "${group.prefix}" redirects to ${declared.to} but its first nav item is ${first.href}. Update SECTION_REDIRECTS in lib/route-paths.ts.`,
      );
    }
  }
}
