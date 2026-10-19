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
import { Label } from "@/components/ui/label";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUIStore } from "@/stores/ui-store";
import { addVehicle, type ActionResult } from "@/app/(app)/operations/vehicles/actions";
import {
  VEHICLE_STATUSES,
  VEHICLES_NAMES,
  VEHICLES_TYPES,
} from "@/lib/database.types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : "Add vehicle"}
    </Button>
  );
}

export function AddVehicleDialog() {
  const { isAddVehicleOpen, closeAddVehicle } = useUIStore();
  const [state, formAction] = useActionState<ActionResult, FormData>(
    addVehicle,
    {},
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Vehicle added.");
      closeAddVehicle();
    }
  }, [state, closeAddVehicle]);

  return (
    <Dialog
      open={isAddVehicleOpen}
      onOpenChange={(open) => !open && closeAddVehicle()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add vehicle</DialogTitle>
          <DialogDescription>
            Register a vehicle in your fleet.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plate_number">Plate number</Label>
            <Input
              id="plate_number"
              name="plate_number"
              placeholder="ABC-1234"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="make_model">Make &amp; model</Label>
            <Input
              id="make_model"
              name="make_model"
              placeholder="Volvo FH16"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue="active">
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-expense">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAddVehicle}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
