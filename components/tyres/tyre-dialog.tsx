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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addTyre, updateTyre, type ActionResult } from "@/app/(app)/operations/tyres/actions";
import {
  TYRE_POSITIONS,
  TYRE_SIZES,
  TYRE_STATUSES,
  TYRE_STATUS_LABEL,
  type TyreVM,
} from "@/lib/tyres";
import type { Vehicle } from "@/lib/database.types";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : editing ? "Save tyre" : "Add tyre"}
    </Button>
  );
}

export function TyreDialog({
  open,
  onOpenChange,
  vehicles,
  tyre,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  tyre?: TyreVM | null;
}) {
  const editing = !!tyre;
  const action: (p: ActionResult, f: FormData) => Promise<ActionResult> = tyre
    ? updateTyre.bind(null, tyre.id)
    : addTyre;

  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});
  const [status, setStatus] = useState(tyre?.status ?? "in_use");

  useEffect(() => {
    if (open) setStatus(tyre?.status ?? "in_use");
  }, [open, tyre]);

  useEffect(() => {
    if (state.success) {
      toast.success(editing ? "Tyre updated." : "Tyre added.");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // A removal reading only makes sense once the tyre is off the vehicle.
  const showRemoved = status === "scrapped" || status === "retreaded";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit tyre" : "Add tyre"}</DialogTitle>
          <DialogDescription>
            Km life is measured from the fitted odometer reading against the
            vehicle&apos;s current reading, so keep that up to date.
          </DialogDescription>
        </DialogHeader>

        <form key={tyre?.id ?? "new"} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tyre-vehicle">Vehicle</Label>
              <Select
                name="vehicle_id"
                defaultValue={tyre?.vehicle_id ?? vehicles[0]?.id}
              >
                <SelectTrigger id="tyre-vehicle">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-status">Status</Label>
              <Select
                name="status"
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger id="tyre-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYRE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TYRE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-brand">Brand</Label>
              <Input
                id="tyre-brand"
                name="brand"
                placeholder="General, Panther, Servis…"
                defaultValue={tyre?.brand ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-size">Size</Label>
              <Combobox
                id="tyre-size"
                name="size"
                options={TYRE_SIZES}
                defaultValue={tyre?.size ?? ""}
                placeholder="1000-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-position">Position</Label>
              <Combobox
                id="tyre-position"
                name="position"
                options={TYRE_POSITIONS}
                defaultValue={tyre?.position ?? ""}
                placeholder="Rear left outer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-serial">Serial number</Label>
              <Input
                id="tyre-serial"
                name="serial_no"
                placeholder="Optional"
                defaultValue={tyre?.serial_no ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-cost">Purchase cost (PKR)</Label>
              <AmountInput
                id="tyre-cost"
                name="purchase_cost"
                placeholder="0"
                defaultValue={tyre?.purchase_cost ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-date">Purchase date</Label>
              <DateField
                id="tyre-date"
                name="purchase_date"
                defaultValue={tyre?.purchase_date}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tyre-fitted">Odometer when fitted (km)</Label>
              <Input
                id="tyre-fitted"
                name="odometer_fitted"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                defaultValue={tyre?.odometer_fitted ?? 0}
              />
            </div>

            {showRemoved && (
              <div className="space-y-2">
                <Label htmlFor="tyre-removed">Odometer when removed (km)</Label>
                <Input
                  id="tyre-removed"
                  name="odometer_removed"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  defaultValue={tyre?.odometer_removed ?? ""}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tyre-retreads">Times retreaded</Label>
              <Input
                id="tyre-retreads"
                name="retread_count"
                type="number"
                min="0"
                max="20"
                step="1"
                inputMode="numeric"
                defaultValue={tyre?.retread_count ?? 0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tyre-notes">Notes</Label>
            <Textarea
              id="tyre-notes"
              name="notes"
              rows={2}
              defaultValue={tyre?.notes ?? ""}
            />
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
            <SubmitButton editing={editing} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
