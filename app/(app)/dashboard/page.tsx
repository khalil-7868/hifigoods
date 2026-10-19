import type { Metadata } from "next";
import { Suspense } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { AttentionStrip } from "@/components/dashboard/attention-strip";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import {
  AttentionSkeleton,
  ChartSkeleton,
  TilesSkeleton,
} from "@/components/layout/page-skeleton";
import { getRoutesWithExpenses, getVehicles } from "@/lib/queries";
import { getParties } from "@/lib/parties-data";
import { getBrokers } from "@/lib/brokers-data";
import {
  computeTotals,
  countActiveVehicles,
  buildTimeSeries,
} from "@/lib/analytics";
import { getMaintenanceFees } from "@/lib/maintenance-data";
import { formatCurrency, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * The page body is split into independently-streamed sections.
 *
 * Previously this awaited all nine queries in one Promise.all before returning
 * any JSX, so a click showed nothing until the slowest query came back. Now the
 * heading paints immediately and each section fills in as its own data lands —
 * the same total work, but the app stops feeling frozen.
 *
 * Every section calls the request-memoized fetchers, so splitting them does NOT
 * multiply queries: `routes` is still read once per request and shared.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your fleet&apos;s financial overview at a glance.
        </p>
      </header>

      <Suspense fallback={<AttentionSkeleton />}>
        <AttentionSection />
      </Suspense>

      <Suspense fallback={<TilesSkeleton count={4} />}>
        <MetricsSection />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <ChartSection />
      </Suspense>
    </div>
  );
}

/** Percent change of the last bucket vs the previous one. */
function delta(series: number[]): { value: string; positive: boolean } | undefined {
  if (series.length < 2) return undefined;
  const last = series[series.length - 1]!;
  const prev = series[series.length - 2]!;
  if (prev === 0) return undefined;
  const pct = ((last - prev) / Math.abs(prev)) * 100;
  return { value: formatPercent(Math.abs(pct)), positive: pct >= 0 };
}

/** True until the first expense exists — see OnboardingChecklist. */
async function isNewAccount(): Promise<boolean> {
  const routes = await getRoutesWithExpenses();
  return !routes.some((r) => r.expenses.length > 0);
}

async function AttentionSection() {
  if (await isNewAccount()) {
    const [routes, vehicles] = await Promise.all([
      getRoutesWithExpenses(),
      getVehicles(),
    ]);
    return (
      <OnboardingChecklist
        hasVehicles={vehicles.length > 0}
        hasRoutes={routes.length > 0}
        hasExpenses={false}
      />
    );
  }

  const [parties, brokers, vehicles, routes] = await Promise.all([
    getParties(),
    getBrokers(),
    getVehicles(),
    getRoutesWithExpenses(),
  ]);

  return (
    <AttentionStrip
      parties={parties}
      brokers={brokers}
      vehicles={vehicles}
      routes={routes}
    />
  );
}

async function MetricsSection() {
  if (await isNewAccount()) return null;

  const [routes, vehicles, maintenance] = await Promise.all([
    getRoutesWithExpenses(),
    getVehicles(),
    getMaintenanceFees(),
  ]);

  // Monthly maintenance is a real running cost, so it reduces profit here too
  // — not just in reports.
  const maintenanceTotal = maintenance.reduce((s, f) => s + Number(f.amount), 0);

  const base = computeTotals(routes);
  const expenses = base.expenses + maintenanceTotal;
  const profit = base.revenue - expenses;
  const margin = base.revenue > 0 ? (profit / base.revenue) * 100 : 0;

  const activeVehicles = countActiveVehicles(vehicles);
  const series = buildTimeSeries(routes, "monthly");
  const profitTrend = series.map((b) => b.profit);
  const expenseTrend = series.map((b) => b.expenses);
  const revenueTrend = series.map((b) => b.revenue);
  const marginTrend = series.map((b) =>
    b.revenue > 0 ? ((b.revenue - b.expenses) / b.revenue) * 100 : 0,
  );

  return (
    <section
      aria-label="Key metrics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Total Profit"
        value={formatCurrency(profit)}
        hint={`From ${formatCurrency(base.revenue)} revenue`}
        icon="profit"
        accent="emerald"
        trend={profitTrend}
        delta={delta(profitTrend)}
      />
      <StatCard
        label="Total Expenses"
        value={formatCurrency(expenses)}
        hint={`Across ${routes.length} route${routes.length === 1 ? "" : "s"}`}
        icon="expenses"
        accent="rose"
        trend={expenseTrend}
        delta={delta(expenseTrend)}
      />
      <StatCard
        label="Active Vehicles"
        value={String(activeVehicles)}
        hint={`${vehicles.length} total in fleet`}
        icon="vehicles"
        accent="violet"
        trend={revenueTrend}
      />
      <StatCard
        label="Net Margin"
        value={formatPercent(margin)}
        hint="Profit ÷ revenue"
        icon="margin"
        accent="sky"
        trend={marginTrend}
        delta={delta(marginTrend)}
      />
    </section>
  );
}

async function ChartSection() {
  if (await isNewAccount()) return null;

  const [routes, vehicles] = await Promise.all([
    getRoutesWithExpenses(),
    getVehicles(),
  ]);

  return (
    <section aria-label="Profit and expense trends">
      <OverviewChart routes={routes} vehicles={vehicles} />
    </section>
  );
}
