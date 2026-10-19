"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addSubRoute,
  updateSubRoute,
  type ActionResult,
} from "@/app/(app)/operations/routes/actions";
import { BrokerFields } from "@/components/routes/broker-fields";
import { cn } from "@/lib/utils";
import { asBrokerCommissionType } from "@/lib/database.types";
import type { Broker } from "@/lib/database.types";
import type { RouteVM } from "@/lib/routes-data";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : editing ? "Save leg" : "Add leg"}
    </Button>
  );
}

interface SubRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Main route id — required when adding. */
  parentId: string;
  /** When provided, the dialog edits this leg instead of adding one. */
  leg?: RouteVM | null;
  /** Brokers available to arrange this leg. */
  brokers?: Broker[];
}

export function SubRouteDialog({
  open,
  onOpenChange,
  parentId,
  leg,
  brokers = [],
}: SubRouteDialogProps) {
  const editing = !!leg;
  const [showDetails, setShowDetails] = useState(
    !!(leg?.material || leg?.weight || leg?.notes),
  );

  const action: (p: ActionResult, f: FormData) => Promise<ActionResult> = leg
    ? updateSubRoute.bind(null, leg.id)
    : addSubRoute.bind(null, parentId);

  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});

  useEffect(() => {
    if (state.success) {
      toast.success(editing ? "Leg updated." : "Leg added.");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit leg" : "Add leg"}</DialogTitle>
          <DialogDescription>
            A leg is one stage of the trip. The main route&apos;s rent is the
            sum of all legs.
          </DialogDescription>
        </DialogHeader>

        <form key={leg?.id ?? "new"} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leg-origin">From</Label>
              <Input
                id="leg-origin"
                name="origin"
                placeholder="Rahim Yar Khan"
                defaultValue={leg?.origin ?? ""}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leg-destination">To</Label>
              <Input
                id="leg-destination"
                name="destination"
                placeholder="Karachi"
                defaultValue={leg?.destination ?? ""}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leg-revenue">Rent (PKR)</Label>
            <AmountInput
              id="leg-revenue"
              name="revenue"
              placeholder="0"
              defaultValue={leg?.revenue ?? ""}
              required
            />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={showDetails}
              onClick={() => setShowDetails((s) => !s)}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  showDetails && "rotate-180",
                )}
              />
              More details (material, weight, notes)
            </button>

            {showDetails && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leg-material">Material</Label>
                  <Input
                    id="leg-material"
                    name="material"
                    placeholder="Cement, cloth, machinery…"
                    defaultValue={leg?.material ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leg-weight">Weight (kg)</Label>
                  <Input
                    id="leg-weight"
                    name="weight"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    defaultValue={leg?.weight ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="leg-notes">Notes</Label>
                  <Textarea
                    id="leg-notes"
                    name="notes"
                    rows={2}
                    placeholder="Optional details…"
                    defaultValue={leg?.notes ?? ""}
                  />
                </div>
              </div>
            )}
          </div>

          <BrokerFields
            brokers={brokers}
            idPrefix={`leg-${leg?.id ?? "new"}`}
            defaultBrokerId={leg?.broker_id}
            defaultType={asBrokerCommissionType(leg?.broker_commission_type)}
            defaultValue={leg?.broker_commission_value}
          />

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
            <SubmitButton editing={editing} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
