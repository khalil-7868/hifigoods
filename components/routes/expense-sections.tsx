"use client";

import { Fuel, Receipt } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooterRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseRow } from "@/components/routes/expense-row";
import { DieselRow } from "@/components/routes/diesel-row";
import { BatchExpenseForm } from "@/components/routes/batch-expense-form";
import { DieselEntryForm } from "@/components/routes/diesel-entry-form";
import { formatCurrency } from "@/lib/format";
import type { ExpenseVM } from "@/lib/routes-data";

export function splitExpenses(expenses: ExpenseVM[]) {
  const diesel = expenses.filter((e) => e.kind === "diesel");
  const road = expenses.filter((e) => e.kind !== "diesel");
  const dieselTotal = diesel.reduce((s, e) => s + Number(e.amount), 0);
  const dieselLitres = diesel.reduce((s, e) => s + Number(e.quantity ?? 0), 0);
  const roadTotal = road.reduce((s, e) => s + Number(e.amount), 0);
  return { diesel, road, dieselTotal, dieselLitres, roadTotal };
}

/**
 * The two expense areas for a route or leg: diesel fills (with slip, pump,
 * rate, litres and receipts) and general road expenses.
 */
export function ExpenseSections({
  routeId,
  expenses,
  compact = false,
}: {
  routeId: string;
  expenses: ExpenseVM[];
  /** Tighter headings when nested inside a leg card. */
  compact?: boolean;
}) {
  const { diesel, road, dieselTotal, dieselLitres, roadTotal } =
    splitExpenses(expenses);

  const avgRate = dieselLitres > 0 ? dieselTotal / dieselLitres : 0;

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- Diesel */}
      <Card>
        <CardHeader className={compact ? "p-4" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fuel className="size-4 text-warning" aria-hidden />
            Diesel
          </CardTitle>
          <CardDescription>
            {diesel.length > 0
              ? `${diesel.length} fill${diesel.length === 1 ? "" : "s"} · ${dieselLitres.toLocaleString()} L · avg ${formatCurrency(avgRate)}/L`
              : "Record each fill with slip number, pump, rate and litres."}
          </CardDescription>
        </CardHeader>
        <CardContent className={compact ? "space-y-4 p-4 pt-0" : "space-y-4"}>
          {diesel.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slip #</TableHead>
                  <TableHead>Pump</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rate/L</TableHead>
                  <TableHead>Litres</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right no-print">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diesel.map((e) => (
                  <DieselRow key={e.id} expense={e} />
                ))}
                <TableFooterRow>
                  <TableCell colSpan={4} className="text-right text-muted-foreground">
                    Total
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {dieselLitres.toLocaleString()} L
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums text-expense">
                    {formatCurrency(dieselTotal)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableFooterRow>
              </TableBody>
            </Table>
          )}

          <div className="no-print">
            <DieselEntryForm routeId={routeId} />
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------- Road expenses */}
      <Card>
        <CardHeader className={compact ? "p-4" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4 text-info" aria-hidden />
            Road expenses
          </CardTitle>
          <CardDescription>
            {road.length > 0
              ? `${road.length} entr${road.length === 1 ? "y" : "ies"} · ${formatCurrency(roadTotal)}`
              : "Tolls, food, labour and anything else on the road."}
          </CardDescription>
        </CardHeader>
        <CardContent className={compact ? "space-y-4 p-4 pt-0" : "space-y-4"}>
          {road.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right no-print">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {road.map((e) => (
                  <ExpenseRow key={e.id} expense={e} />
                ))}
                <TableFooterRow>
                  <TableCell className="text-muted-foreground">Total</TableCell>
                  <TableCell className="font-semibold tabular-nums text-expense">
                    {formatCurrency(roadTotal)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableFooterRow>
              </TableBody>
            </Table>
          )}

          <div className="no-print">
            <BatchExpenseForm routeId={routeId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
