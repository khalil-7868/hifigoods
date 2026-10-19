"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Printer,
  Trash2,
  Truck,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdvanceDialog } from "@/components/drivers/advance-dialog";
import {
  deleteAdvance,
  restoreAdvance,
  returnAdvance,
  settleAdvance,
} from "@/app/(app)/ledgers/drivers/actions";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DriverDetail } from "@/lib/drivers-data";
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

export function DriverLedger({ detail }: { detail: DriverDetail }) {
  const { driver, advances, trips } = detail;
  const [advOpen, setAdvOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBusy, startBusy] = useTransition();

  const { remove, isPending: isDeleting } = useUndoableDelete({
    onDelete: (id: string) => deleteAdvance(id, driver.id),
    onRestore: (row) => restoreAdvance(row, driver.id),
    deletedMessage: (row) =>
      row
        ? `Peshgi of ${formatCurrency(Number(row.amount_given))} deleted.`
        : "Peshgi deleted.",
    restoredMessage: "Peshgi restored.",
  });

  function handleReturnAll(advanceId: string, outstanding: number) {
    startBusy(async () => {
      const result = await returnAdvance(advanceId, driver.id, outstanding);
      if (result.error) toast.error(result.error);
      else toast.success("Marked returned.");
    });
  }

  function handleToggleSettled(advanceId: string, settled: boolean) {
    startBusy(async () => {
      const result = await settleAdvance(advanceId, driver.id, settled);
      if (result.error) toast.error(result.error);
      else toast.success(settled ? "Marked settled." : "Reopened.");
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={PATHS.drivers}>
            <ArrowLeft aria-hidden />
            All drivers
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {driver.name}
              {!driver.active && <Badge variant="outline">Inactive</Badge>}
            </CardTitle>
            <CardDescription>
              {[driver.phone, driver.cnic, driver.license_no]
                .filter(Boolean)
                .join(" · ") || "No contact details recorded"}
            </CardDescription>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden />
              Print
            </Button>
            <Button onClick={() => setAdvOpen(true)}>
              <Plus aria-hidden />
              Record peshgi
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <section
            aria-label="Peshgi summary"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <Metric label="Given" value={formatCurrency(driver.given)} />
            <Metric
              label="Returned"
              value={formatCurrency(driver.returned)}
              tone="profit"
            />
            <Metric
              label="Outstanding"
              value={formatCurrency(driver.outstanding)}
              tone={driver.outstanding > 0 ? "expense" : "profit"}
            />
            <Metric label="Trips run" value={String(driver.tripCount)} />
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1 border-b">
          <CardTitle>Peshgi history</CardTitle>
          <CardDescription>
            Money given before a trip, and what came back.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {advances.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No peshgi recorded for {driver.name} yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Against</TableHead>
                  <TableHead className="text-right">Given</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right no-print">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.map((a) => {
                  const outstanding = a.balance;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(a.date)}
                      </TableCell>
                      <TableCell>
                        {a.route ? (
                          <Link
                            href={PATHS.route(a.route.id)}
                            className="hover:underline"
                          >
                            {a.route.origin} → {a.route.destination}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {a.notes ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(a.amount_given))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-profit">
                        {formatCurrency(Number(a.amount_returned))}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.settled ? (
                          <Badge variant="profit">Settled</Badge>
                        ) : (
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              outstanding > 0 ? "text-expense" : "text-profit",
                            )}
                          >
                            {formatCurrency(outstanding)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right no-print">
                        <div className="flex justify-end gap-1">
                          {!a.settled && outstanding > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Mark fully returned"
                              title="Mark fully returned"
                              disabled={isBusy}
                              onClick={() =>
                                handleReturnAll(a.id, outstanding)
                              }
                            >
                              <Undo2 className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={
                              a.settled ? "Reopen advance" : "Mark settled"
                            }
                            title={
                              a.settled
                                ? "Reopen advance"
                                : "Mark settled without a return"
                            }
                            disabled={isBusy}
                            onClick={() =>
                              handleToggleSettled(a.id, !a.settled)
                            }
                          >
                            <Check
                              className={cn(
                                "size-4",
                                a.settled && "text-profit",
                              )}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-expense"
                            aria-label="Delete peshgi"
                            disabled={isDeleting && deletingId === a.id}
                            onClick={() => {
                              setDeletingId(a.id);
                              remove(a.id);
                            }}
                          >
                            {isDeleting && deletingId === a.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1 border-b">
          <CardTitle>Trips run</CardTitle>
          <CardDescription>
            Every main route assigned to {driver.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {trips.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Truck className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No trips assigned yet. Pick this driver when adding or editing a
                route.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="w-10 no-print" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.origin} → {t.destination}
                      {!t.end_date && (
                        <Badge variant="outline" className="ml-2">
                          open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.plate ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(t.start_date)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(t.revenue)}
                    </TableCell>
                    <TableCell className="no-print">
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={PATHS.route(t.id)}
                          aria-label={`Open trip ${t.origin} to ${t.destination}`}
                        >
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AdvanceDialog
        open={advOpen}
        onOpenChange={setAdvOpen}
        driverId={driver.id}
        trips={trips}
      />
    </div>
  );
}
