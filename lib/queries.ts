import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import type { RouteWithExpenses } from "@/lib/analytics";
import type { Vehicle } from "@/lib/database.types";

/**
 * Fetch all of the current user's routes (main routes AND legs), each with its
 * expenses embedded. RLS scopes rows to the authenticated user automatically.
 *
 * A main route's rent is the sum of its legs, and the legs are in this same
 * list — so we zero out a parent's own revenue to avoid double-counting it in
 * dashboard totals and time series. Expenses are never zeroed: they roll up
 * naturally because every row contributes its own.
 *
 * Memoized per request: the dashboard's streamed sections each need these rows,
 * and without `cache()` splitting the page into Suspense boundaries would turn
 * one query into four.
 */
export const getRoutesWithExpenses = cache(async (): Promise<
  RouteWithExpenses[]
> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routes")
    .select("*, expenses(*)")
    .order("start_date", { ascending: false });

  if (error) throwDbError(error.message);

  const rows = (data ?? []) as RouteWithExpenses[];
  const parentIds = new Set(
    rows.map((r) => r.parent_route_id).filter((id): id is string => !!id),
  );

  return rows.map((r) =>
    parentIds.has(r.id) ? { ...r, revenue: 0 } : r,
  );
});

export const getVehicles = cache(async (): Promise<Vehicle[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throwDbError(error.message);
  return data ?? [];
})
