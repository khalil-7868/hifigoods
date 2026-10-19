"use client";

import { Plus, Route as RouteIcon, SearchX, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { RouteCard } from "@/components/routes/route-card";
import { RouteFormDialog } from "@/components/routes/route-form-dialog";
import { RoutesFilters } from "@/components/routes/routes-filters";
import { useUIStore } from "@/stores/ui-store";
import { useNewParam } from "@/lib/use-new-param";
import type { Broker, Driver, Party, Vehicle } from "@/lib/database.types";
import type { RoutesPage } from "@/lib/routes-data";

export function RoutesView({
  result,
  vehicles,
  parties = [],
  brokers = [],
  drivers = [],
  query = "",
  vehicleId = "all",
  from = "",
  to = "",
}: {
  result: RoutesPage;
  vehicles: Vehicle[];
  parties?: Party[];
  brokers?: Broker[];
  drivers?: Driver[];
  query?: string;
  vehicleId?: string;
  from?: string;
  to?: string;
}) {
  const openAddRoute = useUIStore((s) => s.openAddRoute);
  const noVehicles = vehicles.length === 0;

  useNewParam(() => {
    if (!noVehicles) openAddRoute();
  });

  const { routes, total, page, perPage, pageCount, filtered } = result;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routes</h1>
          <p className="text-sm text-muted-foreground">
            Track trips, revenue, and per-route expenses.
          </p>
        </div>
        <Button onClick={openAddRoute} disabled={noVehicles}>
          <Plus aria-hidden />
          Add route
        </Button>
      </header>

      {noVehicles ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No vehicles yet"
            description="You need at least one vehicle before adding routes."
          />
        </Card>
      ) : (
        <>
          {/* Filters stay visible even at zero results, so a too-narrow
              filter can be widened without hunting for the reset. */}
          {(total > 0 || filtered) && (
            <RoutesFilters
              vehicles={vehicles}
              vehicleId={vehicleId}
              from={from}
              to={to}
            />
          )}

          {routes.length === 0 ? (
            <Card>
              {filtered ? (
                <EmptyState
                  icon={SearchX}
                  title="No routes match these filters"
                  description={
                    query
                      ? `Nothing matches "${query}" in the selected range. Try widening the dates or clearing the search.`
                      : "Nothing in the selected vehicle or date range. Try widening the filters."
                  }
                />
              ) : (
                <EmptyState
                  icon={RouteIcon}
                  title="No routes yet"
                  description="Add your first trip to start tracking profit."
                  action={
                    <Button variant="outline" onClick={openAddRoute}>
                      <Plus aria-hidden />
                      Add route
                    </Button>
                  }
                />
              )}
            </Card>
          ) : (
            <>
              <section className="space-y-4" aria-label="Routes list">
                {routes.map((route) => (
                  <RouteCard key={route.id} route={route} />
                ))}
              </section>

              <Pagination
                page={page}
                pageCount={pageCount}
                total={total}
                perPage={perPage}
                label="routes"
              />
            </>
          )}
        </>
      )}

      <RouteFormDialog
        vehicles={vehicles}
        parties={parties}
        brokers={brokers}
        drivers={drivers}
      />
    </div>
  );
}
