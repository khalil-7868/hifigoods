"use client";

import { useActionState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  addDriver,
  updateDriver,
  type ActionResult,
} from "@/app/(app)/ledgers/drivers/actions";
import type { Driver } from "@/lib/database.types";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : editing ? "Save driver" : "Add driver"}
    </Button>
  );
}

export function DriverDialog({
  open,
  onOpenChange,
  driver,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
}) {
  const editing = !!driver;
  const action: (p: ActionResult, f: FormData) => Promise<ActionResult> = driver
    ? updateDriver.bind(null, driver.id)
    : addDriver;

  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});

  useEffect(() => {
    if (state.success) {
      toast.success(editing ? "Driver updated." : "Driver added.");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit driver" : "Add driver"}</DialogTitle>
          <DialogDescription>
            Drivers can be assigned to a trip and given peshgi against it.
          </DialogDescription>
        </DialogHeader>

        <form
          key={driver?.id ?? "new"}
          action={formAction}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="driver-name">Name</Label>
            <Input
              id="driver-name"
              name="name"
              placeholder="Muhammad Aslam"
              defaultValue={driver?.name ?? ""}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver-phone">Phone</Label>
              <Input
                id="driver-phone"
                name="phone"
                inputMode="tel"
                placeholder="03xx-xxxxxxx"
                defaultValue={driver?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-cnic">CNIC</Label>
              <Input
                id="driver-cnic"
                name="cnic"
                inputMode="numeric"
                placeholder="31303-xxxxxxx-x"
                defaultValue={driver?.cnic ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-license">Licence number</Label>
            <Input
              id="driver-license"
              name="license_no"
              placeholder="Optional"
              defaultValue={driver?.license_no ?? ""}
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <input
              id="driver-active"
              name="active"
              type="checkbox"
              defaultChecked={driver?.active ?? true}
              className="mt-0.5 size-4 accent-[hsl(var(--primary))]"
            />
            <div>
              <Label htmlFor="driver-active" className="cursor-pointer">
                Currently employed
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive drivers stay in the records and keep their history, but
                stop appearing in the trip picker.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-notes">Notes</Label>
            <Textarea
              id="driver-notes"
              name="notes"
              rows={2}
              defaultValue={driver?.notes ?? ""}
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
