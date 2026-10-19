"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableFooterRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FUEL_PUMPS } from "@/lib/database.types";
import { RECEIPT_ACCEPT } from "@/lib/storage";
import { formatCurrency, todayISO } from "@/lib/format";
import { addDieselEntries } from "@/app/(app)/operations/routes/actions";
import { useOfflineSubmit } from "@/lib/offline/use-offline-submit";

const BLANK_ROWS = 2;

interface Row {
  id: number;
  slip: string;
  pump: string;
  date: string;
  rate: string;
  qty: string;
  amount: string;
  /** True once the user edits the total by hand, so we stop auto-filling it. */
  amountTouched: boolean;
}

function blankRow(id: number): Row {
  return {
    id,
    slip: "",
    pump: "",
    date: todayISO(),
    rate: "",
    qty: "",
    amount: "",
    amountTouched: false,
  };
}

/**
 * `useFormStatus` is not used here: the form's action is our own offline-aware
 * handler, which starts its own transition and returns immediately, so React's
 * form-status pending flag would clear before the work finishes.
 */
function SaveAllButton({
  count,
  pending,
}: {
  count: number;
  pending: boolean;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Save aria-hidden />
      )}
      {pending ? "Saving…" : `Save all (${count})`}
    </Button>
  );
}

/**
 * Diesel fills for a trip. A long route can be filled several times at
 * different pumps, so this is a table with one row per fill. Total is
 * auto-calculated as rate x litres but can be overridden.
 */
export function DieselEntryForm({ routeId }: { routeId: string }) {
  const nextId = useRef(BLANK_ROWS);
  const [rows, setRows] = useState<Row[]>(
    Array.from({ length: BLANK_ROWS }, (_, i) => blankRow(i)),
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Diesel is the write most likely to happen with no signal — a pump on a
  // long route is exactly where coverage disappears.
  const { submit, state, isPending } = useOfflineSubmit({
    kind: "diesel",
    routeId,
    action: (formData) => addDieselEntries(routeId, {}, formData),
    describe: (formData) => {
      const count = Number(formData.get("count") ?? 0);
      let sum = 0;
      let fills = 0;
      for (let i = 0; i < count; i++) {
        const amount = Number(formData.get(`amount-${i}`) ?? 0) || 0;
        if (amount > 0) fills += 1;
        sum += amount;
      }
      return `${fills} diesel fill${fills === 1 ? "" : "s"} · ${formatCurrency(sum)}`;
    },
    onSuccess: () => {
      formRef.current?.reset();
      nextId.current = BLANK_ROWS;
      setRows(Array.from({ length: BLANK_ROWS }, (_, i) => blankRow(i)));
    },
  });

  useEffect(() => {
    if (state.success && !state.queued) toast.success("Diesel entries saved.");
  }, [state.success, state.queued]);

  function update(id: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // Keep the total in step with rate x qty until it's edited directly.
        if (!next.amountTouched && ("rate" in patch || "qty" in patch)) {
          const total = Number(next.rate || 0) * Number(next.qty || 0);
          next.amount = total > 0 ? String(Math.round(total)) : "";
        }
        return next;
      }),
    );
  }

  const grandTotal = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalLitres = rows.reduce((s, r) => s + Number(r.qty || 0), 0);

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      <input type="hidden" name="count" value={rows.length} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Slip #</TableHead>
            <TableHead>Pump</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Rate/L</TableHead>
            <TableHead>Litres</TableHead>
            <TableHead>Total (PKR)</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.id}>
              <TableCell>
                <Input
                  name={`slip-${i}`}
                  value={row.slip}
                  onChange={(e) => update(row.id, { slip: e.target.value })}
                  placeholder="1234"
                  aria-label={`Slip number row ${i + 1}`}
                  className="min-w-24"
                />
              </TableCell>
              <TableCell>
                <Combobox
                  id={`pump-${i}`}
                  name={`pump-${i}`}
                  options={FUEL_PUMPS}
                  value={row.pump}
                  onChange={(e) => update(row.id, { pump: e.target.value })}
                  placeholder="PSO"
                  aria-label={`Pump row ${i + 1}`}
                  className="min-w-28"
                />
              </TableCell>
              <TableCell>
                <Input
                  name={`date-${i}`}
                  type="date"
                  value={row.date}
                  onChange={(e) => update(row.id, { date: e.target.value })}
                  aria-label={`Date row ${i + 1}`}
                  className="min-w-36"
                />
              </TableCell>
              <TableCell>
                <Input
                  name={`rate-${i}`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={row.rate}
                  onChange={(e) => update(row.id, { rate: e.target.value })}
                  placeholder="0"
                  aria-label={`Rate row ${i + 1}`}
                  className="min-w-24"
                />
              </TableCell>
              <TableCell>
                <Input
                  name={`qty-${i}`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={row.qty}
                  onChange={(e) => update(row.id, { qty: e.target.value })}
                  placeholder="0"
                  aria-label={`Litres row ${i + 1}`}
                  className="min-w-24"
                />
              </TableCell>
              <TableCell>
                <AmountInput
                  name={`amount-${i}`}
                  value={row.amount}
                  onValueChange={(raw) =>
                    update(row.id, { amount: raw, amountTouched: true })
                  }
                  placeholder="0"
                  aria-label={`Total row ${i + 1}`}
                  className="min-w-28 font-medium"
                />
              </TableCell>
              <TableCell>
                <Input
                  name={`receipt-${i}`}
                  type="file"
                  accept={RECEIPT_ACCEPT}
                  aria-label={`Receipt row ${i + 1}`}
                  className="min-w-40 cursor-pointer text-xs file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove row ${i + 1}`}
                  onClick={() =>
                    setRows((r) =>
                      r.length > 1 ? r.filter((x) => x.id !== row.id) : r,
                    )
                  }
                  disabled={rows.length === 1}
                  className="text-muted-foreground hover:text-expense"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {grandTotal > 0 && (
            <TableFooterRow className="sticky bottom-0 z-10 bg-card/95 backdrop-blur">
              <TableCell colSpan={4} className="text-right text-muted-foreground">
                Total
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {totalLitres.toLocaleString()} L
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(grandTotal)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableFooterRow>
          )}
        </TableBody>
      </Table>

      {state.error && (
        <p role="alert" className="text-sm text-expense">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setRows((r) => [...r, blankRow(nextId.current++)])
          }
        >
          <Plus aria-hidden />
          Add fill
        </Button>
        <SaveAllButton count={rows.length} pending={isPending} />
      </div>
    </form>
  );
}
