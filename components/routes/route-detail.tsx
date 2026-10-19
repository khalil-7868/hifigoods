"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Plus,
  Printer,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExpenseSections } from "@/components/routes/expense-sections";
import { RouteFormDialog } from "@/components/routes/route-form-dialog";
import { SubRouteCard } from "@/components/routes/sub-route-card";
import { SubRouteDialog } from "@/components/routes/sub-route-dialog";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatDate, formatPercent, netMargin } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Broker, Driver, Party, Vehicle } from "@/lib/database.types";
import type { RouteVM } from "@/lib/routes-data";
import { PATHS } from "@/lib/routes";

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "expense";
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums sm:text-2xl",
          tone === "profit" && "text-profit",
          tone === "expense" && "text-expense",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function RouteDetail({
  route,
  vehicles,
  parties = [],
  brokers = [],
  drivers = [],
}: {
  route: RouteVM;
  vehicles: Vehicle[];
  parties?: Party[];
  brokers?: Broker[];
  drivers?: Driver[];
}) {
  const setRouteToEdit = useUIStore((s) => s.setRouteToEdit);
  const [addLegOpen, setAddLegOpen] = useState(false);

  const hasLegs = route.subRoutes.length > 0;
  const margin = netMargin(route.totalRevenue, route.totalExpenses);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Screen-only toolbar + title */}
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={PATHS.routes}>
            <ArrowLeft aria-hidden />
            Back to routes
          </Link>
        </Button>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              <span>{route.origin}</span>
              <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
              <span>{route.destination}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {route.vehicle?.plate_number ?? "Unknown vehicle"}
              {route.vehicle?.make_model ? ` · ${route.vehicle.make_model}` : ""}
              {" · "}
              {formatDate(route.start_date)}
              {route.end_date ? ` – ${formatDate(route.end_date)}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden />
              Print
            </Button>
            <Button variant="outline" onClick={() => setRouteToEdit(route)}>
              <Pencil aria-hidden />
              Edit route
            </Button>
          </div>
        </header>
      </div>

      {/* Printable region */}
      <div data-print-area className="space-y-6">
        <div className="hidden print:block">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="size-5" aria-hidden />
              HiFiGoods
            </div>
            <span className="text-sm">{formatDate(new Date())}</span>
          </div>
          <h1 className="mt-3 text-xl font-semibold">
            {route.origin} → {route.destination}
          </h1>
          <p className="text-sm text-muted-foreground">
            {route.vehicle?.plate_number ?? "Unknown vehicle"}
            {" · "}
            {formatDate(route.start_date)}
            {route.end_date ? ` – ${formatDate(route.end_date)}` : ""}
          </p>
        </div>

        <section
          aria-label="Route financials"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <Metric
            label={hasLegs ? "Total rent" : "Rent"}
            value={formatCurrency(route.totalRevenue)}
          />
          <Metric
            label="Expenses"
            value={formatCurrency(route.totalExpenses)}
            tone="expense"
          />
          <Metric
            label="Profit"
            value={formatCurrency(route.totalProfit)}
            tone={route.totalProfit >= 0 ? "profit" : "expense"}
          />
          <Metric
            label="Net Margin"
            value={formatPercent(margin)}
            tone={margin >= 0 ? "profit" : "expense"}
          />
        </section>

        {/* Legs */}
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle>Sub-routes</CardTitle>
              <CardDescription>
                {hasLegs
                  ? `${route.subRoutes.length} leg${route.subRoutes.length === 1 ? "" : "s"} — total rent is the sum of all legs.`
                  : "Break this trip into legs, each with its own rent and expenses."}
              </CardDescription>
            </div>
            <Button
              className="no-print"
              variant={hasLegs ? "outline" : "default"}
              onClick={() => setAddLegOpen(true)}
            >
              <Plus aria-hidden />
              Add leg
            </Button>
          </CardHeader>
          <CardContent>
            {hasLegs ? (
              <div className="space-y-3">
                {route.subRoutes.map((leg, i) => (
                  <SubRouteCard
                    key={leg.id}
                    leg={leg}
                    parentId={route.id}
                    index={i}
                    brokers={brokers}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No legs yet. Add one to split this trip into stages — for example
                Rahim Yar Khan → Karachi, then Karachi → Lahore.
              </p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Diesel + road expenses for the trip itself.
          With legs, these are trip-level costs; each leg has its own below. */}
      <section aria-label="Trip expenses" className="space-y-2">
        {hasLegs && (
          <p className="text-sm text-muted-foreground">
            Trip-level costs — for anything not tied to a single leg. Expand a
            leg above to record its own diesel and expenses.
          </p>
        )}
        <ExpenseSections routeId={route.id} expenses={route.expenses} />
      </section>

      <RouteFormDialog
        vehicles={vehicles}
        parties={parties}
        brokers={brokers}
        drivers={drivers}
      />
      <SubRouteDialog
        open={addLegOpen}
        onOpenChange={setAddLegOpen}
        parentId={route.id}
        brokers={brokers}
      />
    </div>
  );
}
