"use client";

import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { ROAD_EXPENSE, type ExpenseCategory } from "@/lib/database.types";
import { RECEIPT_ACCEPT } from "@/lib/storage";

export interface ExpenseDefaults {
  category?: ExpenseCategory;
  amount?: number;
  notes?: string | null;
}

/** Shared field set used by both the add form and the inline edit row. */
export function ExpenseFields({
  idPrefix,
  defaults,
  hasReceipt = false,
}: {
  idPrefix: string;
  defaults?: ExpenseDefaults;
  hasReceipt?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <Combobox
          id={`${idPrefix}-category`}
          name="category"
          options={ROAD_EXPENSE}
          defaultValue={defaults?.category ?? "Fuel"}
          placeholder="Pick or type…"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-amount`}>Amount (PKR)</Label>
        <AmountInput
          id={`${idPrefix}-amount`}
          name="amount"
          placeholder="0"
          defaultValue={defaults?.amount ?? ""}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-receipt`}>
          Receipt {hasReceipt && <span className="text-muted-foreground">(replace)</span>}
        </Label>
        <Input
          id={`${idPrefix}-receipt`}
          name="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          className="cursor-pointer file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={2}
          placeholder="Optional details…"
          defaultValue={defaults?.notes ?? ""}
        />
      </div>
    </div>
  );
}
