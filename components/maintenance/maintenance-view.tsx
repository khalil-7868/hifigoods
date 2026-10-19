"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, Save, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MechanicDialog } from "@/components/maintenance/mechanic-dialog";
import { saveMonthlyFees, type ActionResult } from "@/app/(app)/operations/maintenance/actions";
import { monthLabel } from "@/lib/maintenance";
import { formatCurrency } from "@/lib/format";
import type { Mechanic, Vehicle } from "@/lib/database.types";
import type { MaintenanceVM } from "@/lib/maintenance";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Save aria-hidden />
      )}
      {pending ? "Saving…" : "Save month"}
    </Button>
  );
}

export function MaintenanceView({
  vehicles,
  fees,
  mechanics,
  currentMonth,
}: {
  vehicles: Vehicle[];
  fees: MaintenanceVM[];
  mechanics: Mechanic[];
  currentMonth: string;
}) {
  const [month, setMonth] = useState(currentMonth);
  const [mechOpen, setMechOpen] = useState(false);

  const boundAction = saveMonthlyFees.bind(null, month);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    boundAction,
    {},
  );

  useEffect(() => {
    if (state.success) toast.success("Maintenance saved.");
  }, [state]);

  /** Existing amount + mechanic for each vehicle in the selected month. */
  const existing = useMemo(() => {
    const map = new Map<string, { amount: number; mechanicId: string | null }>();
    for (const f of fees) {
      if (f.month === month) {
        map.set(f.vehicle_id, {
          amount: Number(f.amount),
          mechanicId: f.mechanic_id,
        });
      }
    }
    return map;
  }, [fees, month]);

  const monthTotal = vehicles.reduce(
    (s, v) => s + (existing.get(v.id)?.amount ?? 0),
    0,
  );

  /** Recent months, newest first, for the history table. */
  const history = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const f of fees) {
      byMonth.set(f.month, (byMonth.get(f.month) ?? 0) + Number(f.amount));
    }
    return [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12);
  }, [fees]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            A monthly running cost per vehicle. Counted as an expense in the
            dashboard and reports for that month.
          </p>
        </div>
        <Button variant="outline" onClick={() => setMechOpen(true)}>
          <Wrench aria-hidden />
          Mechanics
        </Button>
      </header>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{monthLabel(month)}</CardTitle>
            <CardDescription>
              Leave a vehicle blank to record no fee for this month.
            </CardDescription>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="month-picker">Month</Label>
            <Input
              id="month-picker"
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) =>
                setMonth(e.target.value ? `${e.target.value}-01` : month)
              }
              className="w-full sm:w-44"
            />
          </div>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Wrench className="size-6" aria-hidden />
              </span>
              <p className="text-sm text-muted-foreground">
                Add a vehicle first, then record its monthly maintenance here.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Make &amp; model</TableHead>
                    <TableHead className="w-56">Mechanic</TableHead>
                    <TableHead className="w-44">Monthly fee (PKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        {v.plate_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {v.make_model ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          // Remount on month change so defaults refresh.
                          key={`mech-${v.id}-${month}`}
                          name={`mechanic-${v.id}`}
                          defaultValue={
                            existing.get(v.id)?.mechanicId ?? "none"
                          }
                        >
                          <SelectTrigger
                            aria-label={`Mechanic for ${v.plate_number}`}
                          >
                            <SelectValue placeholder="No mechanic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No mechanic</SelectItem>
                            {mechanics.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                                {m.workshop ? ` · ${m.workshop}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <AmountInput
                          key={`${v.id}-${month}`}
                          name={`amount-${v.id}`}
                          placeholder="0"
                          defaultValue={existing.get(v.id)?.amount ?? ""}
                          aria-label={`Maintenance for ${v.plate_number}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableFooterRow>
                    <TableCell colSpan={3} className="text-right text-muted-foreground">
                      Saved total for {monthLabel(month)}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-expense">
                      {formatCurrency(monthTotal)}
                    </TableCell>
                  </TableFooterRow>
                </TableBody>
              </Table>

              {state.error && (
                <p role="alert" className="text-sm text-expense">
                  {state.error}
                </p>
              )}

              <div className="flex justify-end">
                <SaveButton />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Total maintenance booked per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(([m, total]) => (
                  <TableRow key={m}>
                    <TableCell className="font-medium">
                      {monthLabel(m)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-expense">
                      {formatCurrency(total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <MechanicDialog
        open={mechOpen}
        onOpenChange={setMechOpen}
        mechanics={mechanics}
      />
    </div>
  );
}
