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
import { AmountInput } from "@/components/ui/amount-input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addAdvance, type ActionResult } from "@/app/(app)/ledgers/drivers/actions";
import type { DriverTrip } from "@/lib/drivers-data";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : "Record peshgi"}
    </Button>
  );
}

/**
 * Records peshgi — money handed to a driver before or during a trip.
 *
 * Both amounts are on one form because the common case is handing over cash
 * and getting some back at the end of the same trip; forcing two separate
 * records for one hand-over would not match how it's actually settled.
 */
export function AdvanceDialog({
  open,
  onOpenChange,
  driverId,
  trips,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  trips: DriverTrip[];
}) {
  const boundAction = addAdvance.bind(null, driverId);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    boundAction,
    {},
  );
  const [given, setGiven] = useState("");
  const [returned, setReturned] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success("Peshgi recorded.");
      setGiven("");
      setReturned("");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record peshgi</DialogTitle>
          <DialogDescription>
            Cash given to the driver, and anything returned against it.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adv-given">Given (PKR)</Label>
              <AmountInput
                id="adv-given"
                name="amount_given"
                placeholder="0"
                value={given}
                onValueChange={setGiven}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adv-returned">Returned (PKR)</Label>
              <AmountInput
                id="adv-returned"
                name="amount_returned"
                placeholder="0"
                value={returned}
                onValueChange={setReturned}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adv-date">Date</Label>
            <DateField id="adv-date" name="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adv-route">Against trip</Label>
            <Select name="route_id" defaultValue="none">
              <SelectTrigger id="adv-route">
                <SelectValue placeholder="Not tied to a trip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not tied to a trip</SelectItem>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.origin} → {t.destination}
                    {t.plate ? ` · ${t.plate}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trips.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No trips assigned to this driver yet — pick them on a route to
                link peshgi to a specific run.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adv-notes">Notes</Label>
            <Textarea id="adv-notes" name="notes" rows={2} />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-expense">
              {state.error}
            </p>
          )}

          <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}
