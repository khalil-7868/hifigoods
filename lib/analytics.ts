import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
} from "date-fns";
import type { Expense, Route, Vehicle } from "@/lib/database.types";

export type Interval = "daily" | "weekly" | "monthly" | "yearly";

export const INTERVALS: readonly Interval[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

/** A route joined with its expenses — the base unit for all aggregation. */
export interface RouteWithExpenses extends Route {
  expenses: Expense[];
}

export interface Totals {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number; // percent
}

export interface TimeBucket {
  /** Sort key (ISO-ish) */
  key: string;
  /** Human label for the axis */
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

function expensesOf(route: RouteWithExpenses): number {
  return route.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}

export function computeTotals(routes: RouteWithExpenses[]): Totals {
  const revenue = routes.reduce((s, r) => s + Number(r.revenue), 0);
  const expenses = routes.reduce((s, r) => s + expensesOf(r), 0);
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, expenses, profit, margin };
}

function bucketStart(date: Date, interval: Interval): Date {
  switch (interval) {
    case "daily":
      return startOfDay(date);
    case "weekly":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "monthly":
      return startOfMonth(date);
    case "yearly":
      return startOfYear(date);
  }
}

function bucketLabel(date: Date, interval: Interval): string {
  switch (interval) {
    case "daily":
      return format(date, "MMM d");
    case "weekly":
      return format(date, "'W'II · MMM d");
    case "monthly":
      return format(date, "MMM yyyy");
    case "yearly":
      return format(date, "yyyy");
  }
}

/**
 * Group routes into time buckets by their start_date, summing revenue and
 * expenses per bucket. Returns chronologically sorted series for charts.
 */
export function buildTimeSeries(
  routes: RouteWithExpenses[],
  interval: Interval,
): TimeBucket[] {
  const map = new Map<string, TimeBucket>();

  for (const route of routes) {
    const start = bucketStart(new Date(route.start_date), interval);
    const key = start.toISOString();
    const existing =
      map.get(key) ??
      ({
        key,
        label: bucketLabel(start, interval),
        revenue: 0,
        expenses: 0,
        profit: 0,
      } satisfies TimeBucket);

    existing.revenue += Number(route.revenue);
    existing.expenses += expensesOf(route);
    existing.profit = existing.revenue - existing.expenses;
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Filter routes to a single vehicle, or return all when id is "all". */
export function filterByVehicle(
  routes: RouteWithExpenses[],
  vehicleId: string,
): RouteWithExpenses[] {
  if (vehicleId === "all") return routes;
  return routes.filter((r) => r.vehicle_id === vehicleId);
}

export function countActiveVehicles(vehicles: Vehicle[]): number {
  return vehicles.filter((v) => v.status === "active").length;
}
