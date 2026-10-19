"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Edit + delete buttons for a list row.
 *
 * Exists mainly to make the pending state impossible to get wrong. Every list
 * originally shared one `useTransition` flag across all rows, so deleting one
 * record put a spinner on every delete button and disabled the whole column.
 * That bug was written five times because the markup was copied five times.
 *
 * Here `pending` is a boolean the caller derives per row, and the label is
 * built from the record's name so screen readers announce which record each
 * button belongs to rather than five identical "Delete" buttons.
 */
export function RowActions({
  name,
  onEdit,
  onDelete,
  pending = false,
}: {
  /** The record's display name, used in the accessible labels. */
  name: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** True only for the row currently being acted on. */
  pending?: boolean;
}) {
  return (
    <>
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${name}`}
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-expense"
          aria-label={`Delete ${name}`}
          onClick={onDelete}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      )}
    </>
  );
}
