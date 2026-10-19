import { revalidatePath } from "next/cache";
import { PATHS } from "@/lib/routes";

/**
 * Cache invalidation, declared per entity in one place.
 *
 * ## Why this is centralised
 *
 * Each Server Action used to call `revalidatePath("/parties")` and friends with
 * hand-written literals. Two problems:
 *
 *  1. When paths moved under `/ledgers`, every one of those strings would have
 *     silently stopped matching a real route. Nothing throws — the page just
 *     serves stale figures forever. For a ledger app that's the worst possible
 *     failure mode.
 *  2. The cross-entity fan-out was inconsistent. Editing a route changes party
 *     billing and broker rent, but only some actions remembered to invalidate
 *     those pages.
 *
 * The map below is the whole invalidation contract, reviewable at a glance.
 */

type Entity =
  | "vehicles"
  | "routes"
  | "maintenance"
  | "tyres"
  | "parties"
  | "brokers"
  | "khata"
  | "drivers"
  | "profile";

/**
 * Which list pages a change to each entity affects.
 *
 * The dashboard is in almost every list because its totals and the
 * needs-attention strip read across all of them.
 */
const AFFECTS: Record<Entity, string[]> = {
  // A vehicle appears on routes, drives tyre km life, and is counted on the
  // dashboard and in reports.
  vehicles: [
    PATHS.vehicles,
    PATHS.routes,
    PATHS.tyres,
    PATHS.maintenance,
    PATHS.dashboard,
    PATHS.reports,
  ],

  // A route's rent is party billing AND broker rent AND driver trip history,
  // so all three ledgers move when a route or its expenses change.
  routes: [
    PATHS.routes,
    PATHS.parties,
    PATHS.brokers,
    PATHS.drivers,
    PATHS.dashboard,
    PATHS.reports,
  ],

  maintenance: [PATHS.maintenance, PATHS.dashboard, PATHS.reports],
  tyres: [PATHS.tyres, PATHS.vehicles],

  parties: [PATHS.parties, PATHS.dashboard, PATHS.reports],
  brokers: [PATHS.brokers, PATHS.routes, PATHS.dashboard],
  khata: [PATHS.khata, PATHS.dashboard],
  drivers: [PATHS.drivers, PATHS.routes, PATHS.dashboard],

  profile: [PATHS.settings],
};

/** Detail-page path builders, so a single record's own page refreshes too. */
const DETAIL: Partial<Record<Entity, (id: string) => string>> = {
  routes: PATHS.route,
  parties: PATHS.party,
  brokers: PATHS.broker,
  khata: PATHS.khataContact,
  drivers: PATHS.driver,
};

/**
 * Invalidate everything affected by a change to `entity`.
 *
 * @param id Optional record id — also refreshes that record's detail page.
 */
export function revalidateFor(entity: Entity, id?: string): void {
  for (const path of AFFECTS[entity]) revalidatePath(path);

  const detail = DETAIL[entity];
  if (id && detail) revalidatePath(detail(id));
}

/** Profile changes show in the topbar, which lives in the shared layout. */
export function revalidateLayout(): void {
  revalidatePath("/", "layout");
}
