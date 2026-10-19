"use client";

import { useMemo, useState } from "react";
import { Printer, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildReport,
  describeRange,
  getPeriodRange,
  REPORT_PERIODS,
  type ReportPeriod,
} from "@/lib/reports";
import {
  sumMaintenanceInRange,
  type MaintenanceVM,
} from "@/lib/maintenance";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/lib/database.types";
import type { RouteVM } from "@/lib/routes-data";

interface ReportsViewProps {
  routes: RouteVM[];
  vehicles: Vehicle[];
  owner: string;
  maintenance: MaintenanceVM[];
}

function SummaryTile({
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

export function ReportsView({
  routes,
  vehicles,
  owner,
  maintenance,
}: ReportsViewProps) {
  const [vehicleId, setVehicleId] = useState("all");
  const [period, setPeriod] = useState<ReportPeriod>("month");

  const report = useMemo(() => {
    const maintenanceTotal = sumMaintenanceInRange(
      maintenance,
      getPeriodRange(period),
      vehicleId,
    );
    return buildReport(routes, vehicleId, period, new Date(), maintenanceTotal);
  }, [routes, vehicleId, period, maintenance]);

  const scopeLabel = describeRange(period);
  const vehicleLabel =
    vehicleId === "all"
      ? "All vehicles"
      : (vehicles.find((v) => v.id === vehicleId)?.plate_number ?? "Vehicle");

  return (
    /* Width is set by the page wrapper now. */
    <div className="space-y-6">
      {/* Toolbar — excluded from print */}
      {/* The page owns the heading so it can paint before this data arrives —
          this is just the toolbar. */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as ReportPeriod)}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => window.print()}
            className="col-span-2 sm:col-auto"
          >
            <Printer aria-hidden />
            Print
          </Button>
        </div>
      </div>

      {/* Printable report */}
      <div data-print-area className="space-y-6">
        {/* Print-only header */}
        <div className="hidden print:block">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="size-5" aria-hidden />
              HiFiGoods
            </div>
            <p className="text-sm">{owner}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="gap-1 border-b">
            <CardTitle>Financial Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              {vehicleLabel} · {scopeLabel} · {report.routes.length} route
              {report.routes.length === 1 ? "" : "s"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <section
              aria-label="Totals"
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
              <SummaryTile
                label="Revenue"
                value={formatCurrency(report.revenue)}
              />
              <SummaryTile
                label="Expenses"
                value={formatCurrency(report.expenses)}
                tone="expense"
              />
              <SummaryTile
                label="Profit"
                value={formatCurrency(report.profit)}
                tone={report.profit >= 0 ? "profit" : "expense"}
              />
              <SummaryTile
                label="Net Margin"
                value={formatPercent(report.margin)}
                tone={report.margin >= 0 ? "profit" : "expense"}
              />
            </section>

            {report.routes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No routes in this selection.
              </p>
            ) : (
              <>
                {report.diesel.fills > 0 && (
                  <section aria-label="Diesel summary" className="space-y-2">
                    <h2 className="text-sm font-semibold">Diesel</h2>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <SummaryTile
                        label="Fills"
                        value={String(report.diesel.fills)}
                      />
                      <SummaryTile
                        label="Litres"
                        value={`${report.diesel.litres.toLocaleString()} L`}
                      />
                      <SummaryTile
                        label="Avg rate/L"
                        value={formatCurrency(report.diesel.avgRate)}
                      />
                      <SummaryTile
                        label="Diesel spend"
                        value={formatCurrency(report.diesel.amount)}
                        tone="expense"
                      />
                    </div>
                  </section>
                )}

                <section aria-label="Expenses by category" className="space-y-2">
                  <h2 className="text-sm font-semibold">Expenses by category</h2>
                  {report.byCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No expenses recorded.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byCategory.map((c) => (
                          <TableRow key={c.category}>
                            <TableCell className="font-medium">
                              {c.category}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(c.amount)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatPercent(c.pct)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </section>

                <section aria-label="Route breakdown" className="space-y-2">
                  <h2 className="text-sm font-semibold">Route breakdown</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.routes.map((r) => (
                        <TableRow key={r.id} className="print-keep-together">
                          <TableCell className="font-medium">
                            {r.origin} → {r.destination}
                            <span className="block text-xs text-muted-foreground">
                              {r.vehicle?.plate_number ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(r.start_date)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(r.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-expense">
                            {formatCurrency(r.totalExpenses)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium tabular-nums",
                              r.totalProfit >= 0 ? "text-profit" : "text-expense",
                            )}
                          >
                            {formatCurrency(r.totalProfit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              </>
            )}

            <p className="hidden text-xs text-muted-foreground print:block">
              Generated {formatDate(new Date())} · HiFiGoods
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
