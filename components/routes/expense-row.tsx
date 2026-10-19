"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ReceiptViewer } from "@/components/ui/receipt-viewer";
import { ExpenseFields } from "@/components/routes/expense-fields";
import {
  updateExpense,
  deleteExpense,
  restoreExpense,
  type ActionResult,
} from "@/app/(app)/operations/routes/actions";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
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

export function ExpenseRow({ expense }: { expense: ExpenseVM }) {
  const [editing, setEditing] = useState(false);

  const boundUpdate = updateExpense.bind(null, expense.id);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    boundUpdate,
    {},
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Expense updated.");
      setEditing(false);
    }
  }, [state]);

  const { remove, isPending: isDeleting } = useUndoableDelete({
    onDelete: deleteExpense,
    onRestore: restoreExpense,
    deletedMessage: (row) =>
      row
        ? `${row.category} — ${formatCurrency(Number(row.amount))} deleted.`
        : "Expense deleted.",
    restoredMessage: "Expense restored.",
  });

  function handleDelete() {
    remove(expense.id);
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="bg-muted/30">
          <form action={formAction} className="space-y-3 py-1">
            <input type="hidden" name="route_id" value={expense.route_id} />
            <ExpenseFields
              idPrefix={`edit-${expense.id}`}
              hasReceipt={!!expense.receipt_url}
              defaults={{
                category: expense.category,
                amount: Number(expense.amount),
                notes: expense.notes,
              }}
            />
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
      <TableCell>
        <Badge variant="secondary">{expense.category}</Badge>
      </TableCell>
      <TableCell className="font-medium tabular-nums text-expense">
        {formatCurrency(Number(expense.amount))}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(expense.date)}
      </TableCell>
      <TableCell className="max-w-[16rem]">
        <div className="flex items-center gap-2">
          {expense.receiptSignedUrl && (
            <ReceiptViewer
              url={expense.receiptSignedUrl}
              label={expense.category}
            />
          )}
          <span className="truncate text-muted-foreground">
            {expense.notes ?? "—"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right no-print">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit expense"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-expense"
            aria-label="Delete expense"
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
