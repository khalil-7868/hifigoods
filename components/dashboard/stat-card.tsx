"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Percent,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/dashboard/sparkline";

export type Accent = "violet" | "emerald" | "rose" | "sky" | "amber";

/**
 * Icons are resolved by name here (a Client Component) because component
 * references cannot be passed as props from a Server Component.
 */
const STAT_ICONS = {
  profit: TrendingUp,
  expenses: TrendingDown,
  vehicles: Truck,
  margin: Percent,
} satisfies Record<string, LucideIcon>;

export type StatIcon = keyof typeof STAT_ICONS;

const accentMap: Record<
  Accent,
  { chip: string; ring: string; stroke: string }
> = {
  violet: {
    chip: "bg-primary/15 text-primary",
    ring: "from-primary/10",
    stroke: "hsl(var(--chart-1))",
  },
  emerald: {
    chip: "bg-profit/15 text-profit",
    ring: "from-profit/10",
    stroke: "hsl(var(--chart-2))",
  },
  rose: {
    chip: "bg-expense/15 text-expense",
    ring: "from-expense/10",
    stroke: "hsl(var(--chart-3))",
  },
  sky: {
    chip: "bg-info/15 text-info",
    ring: "from-info/10",
    stroke: "hsl(var(--chart-4))",
  },
  amber: {
    chip: "bg-warning/15 text-warning",
    ring: "from-warning/10",
    stroke: "hsl(var(--chart-5))",
  },
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: StatIcon;
  accent?: Accent;
  trend?: number[];
  delta?: { value: string; positive: boolean };
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "violet",
  trend,
  delta,
}: StatCardProps) {
  const styles = accentMap[accent];
  const Icon = STAT_ICONS[icon];

  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br to-transparent",
          styles.ring,
        )}
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              styles.chip,
            )}
            aria-hidden
          >
            <Icon className="size-5" />
          </div>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
                delta.positive
                  ? "bg-profit/15 text-profit"
                  : "bg-expense/15 text-expense",
              )}
            >
              {delta.positive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {delta.value}
            </span>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>

        {trend && trend.length >= 2 && (
          <div className="-mx-1 -mb-1">
            <Sparkline data={trend} color={styles.stroke} />
          </div>
        )}
      </div>
    </Card>
  );
}
