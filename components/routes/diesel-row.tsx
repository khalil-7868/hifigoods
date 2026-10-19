"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Combobox } from "@/components/ui/combobox";
import { TableCell, TableRow } from "@/components/ui/table";
import { ReceiptViewer } from "@/components/ui/receipt-viewer";
import {
  updateExpense,
  deleteExpense,
  restoreExpense,
  type ActionResult,
} from "@/app/(app)/operations/routes/actions";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { FUEL_PUMPS } from "@/lib/database.types";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExpenseVM } from "@/lib/routes-data";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function DieselRow({ expense }: { expense: ExpenseVM }) {
  const [editing, setEditing] = useState(false);

  const boundUpdate = updateExpense.bind(null, expense.id);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    boundUpdate,
    {},
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Diesel entry updated.");
      setEditing(false);
    }
  }, [state]);

  const { remove, isPending: isDeleting } = useUndoableDelete({
    onDelete: deleteExpense,
    onRestore: restoreExpense,
    deletedMessage: (row) =>
      row
        ? `Diesel fill of ${formatCurrency(Number(row.amount))} deleted.`
        : "Diesel entry deleted.",
    restoredMessage: "Diesel entry restored.",
  });

  function handleDelete() {
    remove(expense.id);
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30">
          <form action={formAction} className="space-y-3 py-1">
            <input type="hidden" name="route_id" value={expense.route_id} />
            <input type="hidden" name="category" value="Diesel" />

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-1.5">
                <label htmlFor={`d-slip-${expense.id}`} className="text-xs font-medium">
                  Slip #
                </label>
                <Input
                  id={`d-slip-${expense.id}`}
                  name="slip_no"
                  defaultValue={expense.slip_no ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`d-pump-${expense.id}`} className="text-xs font-medium">
                  Pump
                </label>
                <Combobox
                  id={`d-pump-${expense.id}`}
                  name="pump_name"
                  options={FUEL_PUMPS}
                  defaultValue={expense.pump_name ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`d-date-${expense.id}`} className="text-xs font-medium">
                  Date
                </label>
                <Input
                  id={`d-date-${expense.id}`}
                  name="date"
                  type="date"
                  defaultValue={expense.date}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`d-rate-${expense.id}`} className="text-xs font-medium">
                  Rate/L
                </label>
                <Input
                  id={`d-rate-${expense.id}`}
                  name="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={expense.rate ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`d-qty-${expense.id}`} className="text-xs font-medium">
                  Litres
                </label>
                <Input
                  id={`d-qty-${expense.id}`}
                  name="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={expense.quantity ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`d-amt-${expense.id}`} className="text-xs font-medium">
                  Total (PKR)
                </label>
                <AmountInput
                  id={`d-amt-${expense.id}`}
                  name="amount"
                  defaultValue={Number(expense.amount)}
                  required
                />
              </div>
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-expense">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                <X aria-hidden />
                Cancel
              </Button>
              <SaveButton />
            </div>
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{expense.slip_no ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {expense.pump_name ?? "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDate(expense.date)}
      </TableCell>
      <TableCell className="tabular-nums">
        {expense.rate ? formatCurrency(Number(expense.rate)) : "—"}
      </TableCell>
      <TableCell className="tabular-nums">
        {expense.quantity ? `${Number(expense.quantity).toLocaleString()} L` : "—"}
      </TableCell>
      <TableCell className="font-medium tabular-nums text-expense">
        {formatCurrency(Number(expense.amount))}
      </TableCell>
      <TableCell>
        {expense.receiptSignedUrl ? (
          <ReceiptViewer
            url={expense.receiptSignedUrl}
            label={
              expense.slip_no ? `slip ${expense.slip_no}` : "diesel fill"
            }
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right no-print">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit diesel entry"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-expense"
            aria-label="Delete diesel entry"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
