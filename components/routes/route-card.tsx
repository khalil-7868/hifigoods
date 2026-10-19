"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUIStore } from "@/stores/ui-store";
import { deleteRoute } from "@/app/(app)/operations/routes/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-base font-semibold tabular-nums sm:text-lg",
          tone === "profit" && "text-profit",
          tone === "expense" && "text-expense",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function RouteCard({ route }: { route: RouteVM }) {
  const setRouteToEdit = useUIStore((s) => s.setRouteToEdit);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const legCount = route.subRoutes.length;
  const expenseCount =
    route.expenses.length +
    route.subRoutes.reduce((s, l) => s + l.expenses.length, 0);

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteRoute(route.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Route deleted.");
        setConfirmOpen(false);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
            <span>{route.origin}</span>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            <span>{route.destination}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {route.vehicle?.plate_number ?? "Unknown vehicle"}
            {" · "}
            {formatDate(route.start_date)}
            {route.end_date ? ` – ${formatDate(route.end_date)}` : ""}
            {legCount > 0 && ` · ${legCount} leg${legCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRouteToEdit(route)}
          >
            <Pencil aria-hidden />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-expense"
            aria-label="Delete route"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 grid-cols-3 gap-4">
          <Metric label="Rent" value={formatCurrency(route.totalRevenue)} />
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
        </div>

        <Button asChild variant="secondary" className="shrink-0">
          <Link href={PATHS.route(route.id)}>
            <Badge variant="outline" className="mr-1 font-normal">
              {expenseCount} expense{expenseCount === 1 ? "" : "s"}
            </Badge>
            View details
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete route?"
        description={
          <>
            This deletes the trip {route.origin} → {route.destination}
            {legCount > 0 && `, its ${legCount} leg${legCount === 1 ? "" : "s"}`}{" "}
            and all {expenseCount} of its expense
            {expenseCount === 1 ? "" : "s"} and receipts. This cannot be undone.
          </>
        }
        confirmLabel="Delete route"
        onConfirm={handleDelete}
        pending={isDeleting}
      />
    </Card>
  );
}
