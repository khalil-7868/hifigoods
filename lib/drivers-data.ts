import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import { getMainRouteRevenue, getRouteRows } from "@/lib/route-rows";
import type { Driver, DriverAdvance } from "@/lib/database.types";

export interface DriverVM extends Driver {
  /** Total peshgi handed over. */
  given: number;
  /** Total returned by the driver. */
  returned: number;
  /** given - returned, ignoring rows already marked settled. */
  outstanding: number;
  /** Advances not yet marked settled. */
  openAdvances: number;
  /** Main routes (trips) this driver has run. */
  tripCount: number;
  /** Most recent trip start date, or null. */
  lastTrip: string | null;
}

export interface DriverAdvanceVM extends DriverAdvance {
  /** given - returned for this row. */
  balance: number;
  route: { id: string; origin: string; destination: string } | null;
}

export interface DriverTrip {
  id: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string | null;
  plate: string | null;
  /** Rolled-up rent — legs sum into their parent. */
  revenue: number;
}

export interface DriverDetail {
  driver: DriverVM;
  advances: DriverAdvanceVM[];
  trips: DriverTrip[];
}



function rollUp(
  advances: Pick<DriverAdvance, "amount_given" | "amount_returned" | "settled">[],
) {
  let given = 0;
  let returned = 0;
  let openAdvances = 0;

  for (const a of advances) {
    given += Number(a.amount_given);
    returned += Number(a.amount_returned);
    if (!a.settled) openAdvances += 1;
  }

  return { given, returned, outstanding: given - returned, openAdvances };
}

/** All drivers with peshgi rollups and trip counts. */
export async function getDrivers(): Promise<DriverVM[]> {
  const supabase = await createClient();

  const [driversRes, advancesRes, routesRes] = await Promise.all([
    supabase.from("drivers").select("*").order("name"),
    supabase
      .from("driver_advances")
      .select("driver_id, amount_given, amount_returned, settled"),
    getRouteRows(),
  ]);

  if (driversRes.error) throwDbError(driversRes.error.message);
  if (advancesRes.error) throwDbError(advancesRes.error.message);

  const routes = routesRes;

  const byDriver = new Map<string, typeof advancesRes.data>();
  for (const a of advancesRes.data ?? []) {
    if (!a.driver_id) continue;
    const list = byDriver.get(a.driver_id) ?? [];
    list.push(a);
    byDriver.set(a.driver_id, list);
  }

  const trips = new Map<string, { count: number; last: string | null }>();
  for (const r of routes) {
    if (r.parent_route_id || !r.driver_id) continue;
    const t = trips.get(r.driver_id) ?? { count: 0, last: null };
    t.count += 1;
    if (!t.last || r.start_date > t.last) t.last = r.start_date;
    trips.set(r.driver_id, t);
  }

  return (driversRes.data ?? []).map((d) => {
    const t = trips.get(d.id);
    return {
      ...d,
      ...rollUp(byDriver.get(d.id) ?? []),
      tripCount: t?.count ?? 0,
      lastTrip: t?.last ?? null,
    };
  });
}

/** Lightweight list for the route form's driver picker. */
export const getDriverOptions = cache(async (): Promise<Driver[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throwDbError(error.message);
  return data ?? [];
})

/** One driver with their advance history and the trips they've run. */
export async function getDriverDetail(
  id: string,
): Promise<DriverDetail | null> {
  const supabase = await createClient();

  const [driverRes, advancesRes, routesRes] = await Promise.all([
    supabase.from("drivers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("driver_advances")
      .select("*, routes(id, origin, destination)")
      .eq("driver_id", id)
      .order("date", { ascending: false }),
    getRouteRows(),
  ]);

  if (driverRes.error) throwDbError(driverRes.error.message);
  if (!driverRes.data) return null;
  if (advancesRes.error) throwDbError(advancesRes.error.message);

  const routes = routesRes;
  const revenue = await getMainRouteRevenue();

  const trips: DriverTrip[] = routes
    .filter((r) => !r.parent_route_id && r.driver_id === id)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .map((r) => ({
      id: r.id,
      origin: r.origin,
      destination: r.destination,
      start_date: r.start_date,
      end_date: r.end_date,
      plate: r.vehicles?.plate_number ?? null,
      revenue: revenue.get(r.id) ?? 0,
    }));

  const rawAdvances = (advancesRes.data ?? []) as unknown as (DriverAdvance & {
    routes: { id: string; origin: string; destination: string } | null;
  })[];

  const advances: DriverAdvanceVM[] = rawAdvances.map((a) => ({
    ...a,
    balance: Number(a.amount_given) - Number(a.amount_returned),
    route: a.routes,
  }));

  const t = trips.length;

  return {
    driver: {
      ...driverRes.data,
      ...rollUp(rawAdvances),
      tripCount: t,
      lastTrip: trips[0]?.start_date ?? null,
    },
    advances,
    trips,
  };
}
