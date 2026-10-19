import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  format,
} from "date-fns";
import type { ExpenseCategory } from "@/lib/database.types";
import type { RouteVM } from "@/lib/routes-data";

export type ReportPeriod = "week" | "month" | "year" | "all";

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export interface DateRange {
  start: Date;
  end: Date;
}

export function getPeriodRange(
  period: ReportPeriod,
  ref: Date = new Date(),
): DateRange | null {
  switch (period) {
    case "week":
      return {
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    case "year":
      return { start: startOfYear(ref), end: endOfYear(ref) };
    case "all":
      return null; // no bound
  }
}

export function describeRange(period: ReportPeriod, ref: Date = new Date()): string {
  const range = getPeriodRange(period, ref);
  if (!range) return "All time";
  if (period === "year") return format(ref, "yyyy");
  if (period === "month") return format(ref, "MMMM yyyy");
  return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`;
}

export interface DieselSummary {
  fills: number;
  litres: number;
  amount: number;
  /** Weighted average price per litre across the period. */
  avgRate: number;
}

export interface ReportSummary {
  routes: RouteVM[];
  revenue: number;
  /** Route expenses + maintenance booked in the period. */
  expenses: number;
  /** Route-level expenses only (diesel + road). */
  routeExpenses: number;
  /** Monthly maintenance fees falling inside the period. */
  maintenance: number;
  profit: number;
  margin: number;
  byCategory: { category: ExpenseCategory; amount: number; pct: number }[];
  diesel: DieselSummary;
}

/**
 * Scope routes by vehicle and period (routes are placed by start_date), then
 * roll up totals and a category breakdown. Pure + memo-friendly.
 */
export function buildReport(
  allRoutes: RouteVM[],
  vehicleId: string,
  period: ReportPeriod,
  ref: Date = new Date(),
  maintenanceTotal = 0,
): ReportSummary {
  const range = getPeriodRange(period, ref);

  const routes = allRoutes.filter((r) => {
    if (vehicleId !== "all" && r.vehicle_id !== vehicleId) return false;
    if (!range) return true;
    return isWithinInterval(new Date(r.start_date), range);
  });

  // Rolled-up figures: a main route's rent is the sum of its legs.
  const revenue = routes.reduce((s, r) => s + r.totalRevenue, 0);
  const routeExpenses = routes.reduce((s, r) => s + r.totalExpenses, 0);
  const expenses = routeExpenses + maintenanceTotal;
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const totals = new Map<ExpenseCategory, number>();
  let dieselFills = 0;
  let dieselLitres = 0;
  let dieselAmount = 0;

  for (const route of routes) {
    // Own expenses plus every leg's expenses.
    const all = [route, ...route.subRoutes].flatMap((r) => r.expenses);
    for (const e of all) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount));
      if (e.kind === "diesel") {
        dieselFills += 1;
        dieselLitres += Number(e.quantity ?? 0);
        dieselAmount += Number(e.amount);
      }
    }
  }

  if (maintenanceTotal > 0) {
    totals.set(
      "Maintenance (monthly)",
      (totals.get("Maintenance (monthly)") ?? 0) + maintenanceTotal,
    );
  }

  // Group by whatever category labels actually appear (presets or custom).
  const byCategory = [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      pct: expenses > 0 ? (amount / expenses) * 100 : 0,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    routes,
    revenue,
    expenses,
    routeExpenses,
    maintenance: maintenanceTotal,
    profit,
    margin,
    byCategory,
    diesel: {
      fills: dieselFills,
      litres: dieselLitres,
      amount: dieselAmount,
      avgRate: dieselLitres > 0 ? dieselAmount / dieselLitres : 0,
    },
  };
}
