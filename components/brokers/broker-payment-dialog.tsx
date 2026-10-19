"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Combobox } from "@/components/ui/combobox";
import { TallyCalculator } from "@/components/parties/tally-calculator";
import {
  addBrokerPayment,
  type ActionResult,
} from "@/app/(app)/ledgers/brokers/actions";
import { PAYMENT_METHODS } from "@/lib/database.types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : "Record rent"}
    </Button>
  );
}

export function BrokerPaymentDialog({
  open,
  onOpenChange,
  brokerId,
  outstanding,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brokerId: string;
  outstanding: number;
}) {
  const boundAction = addBrokerPayment.bind(null, brokerId);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    boundAction,
    {},
  );
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success("Rent recorded.");
      setAmount("");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record rent received</DialogTitle>
          <DialogDescription>
            Money the broker has handed over. It settles their oldest unpaid
            legs first.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bp-amount">Amount (PKR)</Label>
              <AmountInput
                id="bp-amount"
                name="amount"
                placeholder="0"
                value={amount}
                onValueChange={setAmount}
                required
                autoFocus
              />
              {outstanding > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() => setAmount(String(Math.round(outstanding)))}
                >
                  Fill full outstanding
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bp-date">Date</Label>
              <DateField id="bp-date" name="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bp-method">Method</Label>
              <Combobox
                id="bp-method"
                name="method"
                options={PAYMENT_METHODS}
                defaultValue="Cash"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bp-notes">Notes</Label>
              <Textarea id="bp-notes" name="notes" rows={2} />
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
              <SubmitButton />
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
