"use client";

import { useTransition } from "react";
import { toast } from "sonner";

export interface DeleteResult<TRow> {
  error?: string;
  success?: boolean;
  /** The deleted row, handed back so it can be re-inserted. */
  restore?: TRow;
}

/**
 * Delete-with-undo for individual ledger rows.
 *
 * Row-level financial entries get an Undo toast rather than a confirmation
 * dialog: they're entered and corrected constantly, so a modal on every
 * mistake is friction on the common path. Entity deletes that cascade
 * (a party, a broker, a whole route) keep their confirm dialog — those aren't
 * recoverable by re-inserting one row.
 *
 * The row really is deleted; Undo re-inserts it under the same id, so the
 * ledger's ordering and any references to it survive.
 */
export function useUndoableDelete<TRow>({
  onDelete,
  onRestore,
  deletedMessage,
  restoredMessage = "Restored.",
  duration = 8000,
}: {
  onDelete: (id: string) => Promise<DeleteResult<TRow>>;
  onRestore: (row: TRow) => Promise<{ error?: string }>;
  /** Toast text — receives the deleted row so it can name the amount. */
  deletedMessage: (row: TRow | undefined) => string;
  restoredMessage?: string;
  duration?: number;
}) {
  const [isPending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      const result = await onDelete(id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const row = result.restore;

      toast.success(deletedMessage(row), {
        duration,
        action: row
          ? {
              label: "Undo",
              onClick: () => {
                startTransition(async () => {
                  const restored = await onRestore(row);
                  if (restored.error) toast.error(restored.error);
                  else toast.success(restoredMessage);
                });
              },
            }
          : undefined,
      });
    });
  }

  return { remove, isPending };
}
