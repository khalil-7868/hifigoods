import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";

/**
 * One shared, request-memoized read of the routes table.
 *
 * ## Why
 *
 * `getParties()`, `getBrokers()` and `getDrivers()` each fetched the whole
 * routes table independently, with three slightly different column lists. The
 * dashboard calls all three plus `getRoutesWithExpenses()`, so a single
 * navigation read `routes` four times over the network to compute figures from
 * the same rows.
 *
 * This selects the union of what those callers need and wraps it in React
 * `cache()`, so within one render pass the query runs exactly once and every
 * caller shares the result. `cache()` is per-request — there is no cross-request
 * staleness and no risk of one user seeing another's rows, because a new
 * request gets a fresh call under its own RLS context.
 *
 * Columns are a deliberate union rather than `*`: the rows are only used for
 * rollups, and pulling `notes`/`material` for every route would bloat the
 * payload for nothing.
 */

const COLUMNS =
  "id, parent_route_id, party_id, broker_id, broker_commission_type, broker_commission_value, driver_id, revenue, origin, destination, start_date, end_date, vehicles(plate_number)";

export interface SharedRouteRow {
  id: string;
  parent_route_id: string | null;
  party_id: string | null;
  broker_id: string | null;
  broker_commission_type: string | null;
  broker_commission_value: number;
  driver_id: string | null;
  revenue: number;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string | null;
  vehicles: { plate_number: string } | null;
}

export const getRouteRows = cache(async (): Promise<SharedRouteRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("routes").select(COLUMNS);
  if (error) throwDbError(error.message);
  return (data ?? []) as unknown as SharedRouteRow[];
});

/**
 * Rolled-up rent per MAIN route id.
 *
 * A main route's rent is the sum of its legs, so a leg must never be counted
 * as its own bill. Shared here because parties, brokers and drivers all need
 * the same rollup and all three previously reimplemented it.
 */
export const getMainRouteRevenue = cache(
  async (): Promise<Map<string, number>> => {
    const rows = await getRouteRows();

    const legTotals = new Map<string, number>();
    for (const r of rows) {
      if (r.parent_route_id) {
        legTotals.set(
          r.parent_route_id,
          (legTotals.get(r.parent_route_id) ?? 0) + Number(r.revenue),
        );
      }
    }

    const out = new Map<string, number>();
    for (const r of rows) {
      if (r.parent_route_id) continue;
      const legs = legTotals.get(r.id);
      out.set(r.id, legs !== undefined ? legs : Number(r.revenue));
    }
    return out;
  },
);
