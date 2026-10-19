/**
 * Paths and redirects — deliberately dependency-free.
 *
 * Split out of `lib/routes.ts` because `next.config.ts` imports the redirect
 * lists, and Next loads the config in plain Node before any bundler exists.
 * `lib/routes.ts` imports lucide-react icons for the nav; dragging an ESM icon
 * library into config evaluation is fragile and pointless. This module imports
 * nothing.
 *
 * `lib/routes.ts` re-exports everything here, so app code keeps importing from
 * one place and never needs to know about the split.
 */

export const PATHS = {
  dashboard: "/dashboard",
  reports: "/reports",
  settings: "/settings",

  // Operations
  vehicles: "/operations/vehicles",
  routes: "/operations/routes",
  route: (id: string) => `/operations/routes/${id}`,
  maintenance: "/operations/maintenance",
  tyres: "/operations/tyres",

  // Ledgers
  parties: "/ledgers/parties",
  party: (id: string) => `/ledgers/parties/${id}`,
  brokers: "/ledgers/brokers",
  broker: (id: string) => `/ledgers/brokers/${id}`,
  khata: "/ledgers/khata",
  khataContact: (id: string) => `/ledgers/khata/${id}`,
  drivers: "/ledgers/drivers",
  driver: (id: string) => `/ledgers/drivers/${id}`,
} as const;

/** Section prefixes, used for active-state, breadcrumbs and section redirects. */
export const SECTIONS = {
  operations: "/operations",
  ledgers: "/ledgers",
} as const;

/**
 * Old flat URLs → new nested ones.
 *
 * Bookmarks, the previous PWA manifest shortcuts, and any page the service
 * worker cached under an old URL all keep working.
 */
export const LEGACY_REDIRECTS: { from: string; to: string }[] = [
  { from: "/vehicles", to: PATHS.vehicles },
  { from: "/routes", to: PATHS.routes },
  { from: "/maintenance", to: PATHS.maintenance },
  { from: "/tyres", to: PATHS.tyres },
  { from: "/parties", to: PATHS.parties },
  { from: "/brokers", to: PATHS.brokers },
  { from: "/khata", to: PATHS.khata },
  { from: "/drivers", to: PATHS.drivers },
];

/**
 * Section roots (`/operations`, `/ledgers`) are prefixes, not pages. But people
 * do trim the last URL segment to "go up", and a 404 is a poor answer to a
 * reasonable action — so each redirects to its first item.
 *
 * Kept in step with NAV_GROUPS by the assertion in lib/routes.ts.
 */
export const SECTION_REDIRECTS: { from: string; to: string }[] = [
  { from: SECTIONS.operations, to: PATHS.vehicles },
  { from: SECTIONS.ledgers, to: PATHS.parties },
];
