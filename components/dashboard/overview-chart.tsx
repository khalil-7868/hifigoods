"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildTimeSeries,
  filterByVehicle,
  INTERVALS,
  type Interval,
  type RouteWithExpenses,
} from "@/lib/analytics";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { Vehicle } from "@/lib/database.types";

interface OverviewChartProps {
  routes: RouteWithExpenses[];
  vehicles: Vehicle[];
}

const intervalLabel: Record<Interval, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function OverviewChart({ routes, vehicles }: OverviewChartProps) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [vehicleId, setVehicleId] = useState<string>("all");

  const data = useMemo(
    () => buildTimeSeries(filterByVehicle(routes, vehicleId), interval),
    [routes, vehicleId, interval],
  );

  return (
    <Card className="glow-accent">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Profit vs. Expenses</CardTitle>
          <CardDescription>
            Revenue and spend per {intervalLabel[interval].toLowerCase()} period.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by vehicle">
              <SelectValue placeholder="All vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate_number}
                  {v.make_model ? ` · ${v.make_model}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={interval} onValueChange={(v) => setInterval(v as Interval)}>
            <TabsList>
              {INTERVALS.map((i) => (
                <TabsTrigger key={i} value={i}>
                  {intervalLabel[i]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            No route data yet for this selection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={(v: number) => formatCompactCurrency(v)}
                tickLine={false}
                axisLine={false}
                width={72}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))" }}
                formatter={(value: number, name) => [formatCurrency(value), name]}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#rev)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                fill="url(#exp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
