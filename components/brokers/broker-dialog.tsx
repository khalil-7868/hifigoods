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
  addBroker,
  updateBroker,
  type ActionResult,
} from "@/app/(app)/ledgers/brokers/actions";
import type { Broker } from "@/lib/database.types";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : editing ? "Save broker" : "Add broker"}
    </Button>
  );
}

export function BrokerDialog({
  open,
  onOpenChange,
  broker,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker?: Broker | null;
}) {
  const editing = !!broker;
  const action: (p: ActionResult, f: FormData) => Promise<ActionResult> = broker
    ? updateBroker.bind(null, broker.id)
    : addBroker;

  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});

  useEffect(() => {
    if (state.success) {
      toast.success(editing ? "Broker updated." : "Broker added.");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit broker" : "Add broker"}</DialogTitle>
          <DialogDescription>
            A broker arranges loads and settles the rent with you.
          </DialogDescription>
        </DialogHeader>

        <form key={broker?.id ?? "new"} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broker-name">Name</Label>
            <Input
              id="broker-name"
              name="name"
              placeholder="Sadiq Goods Adda"
              defaultValue={broker?.name ?? ""}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="broker-phone">Phone</Label>
              <Input
                id="broker-phone"
                name="phone"
                placeholder="03xx-xxxxxxx"
                defaultValue={broker?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker-city">City</Label>
              <Input
                id="broker-city"
                name="city"
                placeholder="Lahore"
                defaultValue={broker?.city ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker-notes">Notes</Label>
            <Textarea
              id="broker-notes"
              name="notes"
              rows={2}
              defaultValue={broker?.notes ?? ""}
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
