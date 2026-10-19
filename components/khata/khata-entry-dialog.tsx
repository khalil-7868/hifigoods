"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TallyCalculator } from "@/components/parties/tally-calculator";
import { addKhataEntry, type ActionResult } from "@/app/(app)/ledgers/khata/actions";
import { cn } from "@/lib/utils";
import type { KhataDirection } from "@/lib/database.types";

function SubmitButton({ direction }: { direction: KhataDirection }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={direction === "gave" ? "destructive" : "profit"}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : direction === "gave" ? "Save — you gave" : "Save — you got"}
    </Button>
  );
}

export function KhataEntryDialog({
  open,
  onOpenChange,
  contactId,
  initialDirection = "gave",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  initialDirection?: KhataDirection;
}) {
  const boundAction = addKhataEntry.bind(null, contactId);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    boundAction,
    {},
  );
  const [direction, setDirection] = useState<KhataDirection>(initialDirection);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) setDirection(initialDirection);
  }, [open, initialDirection]);

  useEffect(() => {
    if (state.success) {
      toast.success("Entry saved.");
      setAmount("");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New entry</DialogTitle>
          <DialogDescription>
            &quot;You gave&quot; increases what they owe you. &quot;You
            got&quot; reduces it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="direction" value={direction} />

            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Direction"
            >
              {(
                [
                  { v: "gave", label: "You gave", Icon: ArrowUpRight },
                  { v: "got", label: "You got", Icon: ArrowDownLeft },
                ] as const
              ).map(({ v, label, Icon }) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={direction === v}
                  onClick={() => setDirection(v)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
                    direction === v
                      ? v === "gave"
                        ? "border-expense bg-expense/10 text-expense"
                        : "border-profit bg-profit/10 text-profit"
                      : "hover:bg-accent",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ke-amount">Amount (PKR)</Label>
              <AmountInput
                id="ke-amount"
                name="amount"
                placeholder="0"
                value={amount}
                onValueChange={setAmount}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ke-date">Date</Label>
              <DateField id="ke-date" name="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ke-notes">Notes</Label>
              <Textarea id="ke-notes" name="notes" rows={2} />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-expense">
                {state.error}
              </p>
            )}

            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <SubmitButton direction={direction} />
            </DialogFooter>
          </form>

          <TallyCalculator
            onUseTotal={(total) => setAmount(String(Math.round(total)))}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
