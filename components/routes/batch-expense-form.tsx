"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ROAD_EXPENSE } from "@/lib/database.types";
import { formatCurrency } from "@/lib/format";
import { addExpenses } from "@/app/(app)/operations/routes/actions";
import { useOfflineSubmit } from "@/lib/offline/use-offline-submit";

interface Row {
  id: number;
  category: string;
  /** Preset rows show a fixed label; added rows get an editable category. */
  preset: boolean;
  /** Free-text note for this line, submitted as `notes-<i>`. */
  description: string;
  amount: string;
}

function presetRows(): Row[] {
  return ROAD_EXPENSE.map((category, i) => ({
    id: i,
    category,
    preset: true,
    description: "",
    amount: "",
  }));
}

/**
 * `useFormStatus` is not used here: the form's action is our own offline-aware
 * handler, which starts its own transition and returns immediately, so React's
 * form-status pending flag would clear before the work finishes.
 */
function SaveButton({
  filled,
  pending,
}: {
  filled: number;
  pending: boolean;
}) {
  return (
    <Button type="submit" disabled={pending || filled === 0}>
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Save aria-hidden />
      )}
      {pending ? "Saving…" : `Save ${filled || ""} expense${filled === 1 ? "" : "s"}`}
    </Button>
  );
}

/**
 * Road expenses laid out as a ledger sheet: every common category is already
 * a row with its label, so you only fill in description and amount. Rows left
 * blank are ignored on save. Extra rows can be added for anything unlisted.
 */
export function BatchExpenseForm({ routeId }: { routeId: string }) {
  const nextId = useRef(ROAD_EXPENSE.length);
  const [rows, setRows] = useState<Row[]>(presetRows);
  const formRef = useRef<HTMLFormElement>(null);

  // Offline-aware: if the connection drops mid-trip the rows are kept on the
  // device and uploaded later, rather than lost with a failed request.
  const { submit, state, isPending } = useOfflineSubmit({
    kind: "expenses",
    routeId,
    action: (formData) => addExpenses(routeId, {}, formData),
    describe: (formData) => {
      const count = Number(formData.get("count") ?? 0);
      let sum = 0;
      for (let i = 0; i < count; i++) {
        sum += Number(formData.get(`amount-${i}`) ?? 0) || 0;
      }
      const filledRows = Array.from({ length: count }).filter(
        (_, i) => Number(formData.get(`amount-${i}`) ?? 0) > 0,
      ).length;
      return `${filledRows} road expense${filledRows === 1 ? "" : "s"} · ${formatCurrency(sum)}`;
    },
    onSuccess: () => {
      formRef.current?.reset();
      nextId.current = ROAD_EXPENSE.length;
      setRows(presetRows());
    },
  });

  useEffect(() => {
    if (state.success && !state.queued) toast.success("Expenses saved.");
  }, [state.success, state.queued]);

  function update(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows],
  );
  const filled = rows.filter((r) => Number(r.amount) > 0).length;

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      <input type="hidden" name="count" value={rows.length} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%]">Expense Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[22%]">Amount (PKR)</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                {row.preset ? (
                  <>
                    {row.category}
                    <input
                      type="hidden"
                      name={`category-${i}`}
                      value={row.category}
                    />
                  </>
                ) : (
                  <Combobox
                    id={`category-${i}`}
                    name={`category-${i}`}
                    options={ROAD_EXPENSE}
                    value={row.category}
                    onChange={(e) =>
                      update(row.id, { category: e.target.value })
                    }
                    placeholder="Category"
                    aria-label={`Category for row ${i + 1}`}
                  />
                )}
              </TableCell>

              <TableCell>
                <Input
                  name={`notes-${i}`}
                  value={row.description}
                  onChange={(e) =>
                    update(row.id, { description: e.target.value })
                  }
                  aria-label={`Description for ${row.category || `row ${i + 1}`}`}
                />
              </TableCell>

              <TableCell>
                <AmountInput
                  name={`amount-${i}`}
                  placeholder="0"
                  value={row.amount}
                  onValueChange={(raw) => update(row.id, { amount: raw })}
                  aria-label={`Amount for ${row.category || `row ${i + 1}`}`}
                />
              </TableCell>

              <TableCell>
                {!row.preset && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove row ${i + 1}`}
                    onClick={() =>
                      setRows((r) => r.filter((x) => x.id !== row.id))
                    }
                    className="text-muted-foreground hover:text-expense"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}

          <TableFooterRow>
            <TableCell colSpan={2} className="text-right text-muted-foreground">
              Total
            </TableCell>
            <TableCell
              className={`text-lg font-semibold tabular-nums ${
                total > 0 ? "text-profit" : "text-muted-foreground"
              }`}
            >
              {formatCurrency(total)}
            </TableCell>
            <TableCell />
          </TableFooterRow>
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
            setRows((r) => [
              ...r,
              {
                id: nextId.current++,
                category: "",
                preset: false,
                description: "",
                amount: "",
              },
            ])
          }
        >
          <Plus aria-hidden />
          Add row
        </Button>
        <SaveButton filled={filled} pending={isPending} />
      </div>
    </form>
  );
}
