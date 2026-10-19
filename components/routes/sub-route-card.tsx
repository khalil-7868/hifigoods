"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseSections } from "@/components/routes/expense-sections";
import { SubRouteDialog } from "@/components/routes/sub-route-dialog";
import { deleteRoute } from "@/app/(app)/operations/routes/actions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Broker } from "@/lib/database.types";
import type { RouteVM } from "@/lib/routes-data";

export function SubRouteCard({
  leg,
  parentId,
  index,
  brokers = [],
}: {
  leg: RouteVM;
  parentId: string;
  index: number;
  brokers?: Broker[];
}) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteRoute(leg.id);
      if (result.error) toast.error(result.error);
      else toast.success("Leg removed.");
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 font-medium">
            <span className="truncate">{leg.origin}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{leg.destination}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {leg.expenses.length} expense
            {leg.expenses.length === 1 ? "" : "s"}
          </p>
          {(leg.material || leg.weight || leg.notes) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[
                leg.material,
                leg.weight ? `${Number(leg.weight).toLocaleString()} kg` : null,
                leg.notes,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-right sm:gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Rent</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(Number(leg.revenue))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-sm font-semibold tabular-nums text-expense">
              {formatCurrency(leg.expensesTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit</p>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                leg.profit >= 0 ? "text-profit" : "text-expense",
              )}
            >
              {formatCurrency(leg.profit)}
            </p>
          </div>
        </div>

        <div className="flex gap-1 no-print">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit leg ${index + 1}`}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-expense"
            aria-label={`Delete leg ${index + 1}`}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={open}
            aria-label={open ? "Hide expenses" : "Show expenses"}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/20 p-4">
          <ExpenseSections routeId={leg.id} expenses={leg.expenses} compact />
        </div>
      )}

      <SubRouteDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        parentId={parentId}
        leg={leg}
        brokers={brokers}
      />
    </div>
  );
}
