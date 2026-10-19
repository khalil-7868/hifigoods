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
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addKhataContact,
  updateKhataContact,
  type ActionResult,
} from "@/app/(app)/ledgers/khata/actions";
import type { KhataContact } from "@/lib/database.types";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : editing ? "Save contact" : "Add contact"}
    </Button>
  );
}

export function KhataContactDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: KhataContact | null;
}) {
  const editing = !!contact;
  const action: (p: ActionResult, f: FormData) => Promise<ActionResult> = contact
    ? updateKhataContact.bind(null, contact.id)
    : addKhataContact;

  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});

  useEffect(() => {
    if (state.success) {
      toast.success(editing ? "Contact updated." : "Contact added.");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle>
          <DialogDescription>
            Someone you lend money to or borrow from, outside route business.
          </DialogDescription>
        </DialogHeader>

        <form key={contact?.id ?? "new"} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kc-name">Name</Label>
            <Input
              id="kc-name"
              name="name"
              placeholder="Ali Raza"
              defaultValue={contact?.name ?? ""}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kc-phone">Phone</Label>
              <Input
                id="kc-phone"
                name="phone"
                placeholder="03xx-xxxxxxx"
                defaultValue={contact?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kc-opening">Opening balance (PKR)</Label>
              <AmountInput
                id="kc-opening"
                name="opening_balance"
                placeholder="0"
                allowNegative
                defaultValue={contact?.opening_balance ?? 0}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Positive if they already owed you, negative if you owed them.
          </p>

          <div className="space-y-2">
            <Label htmlFor="kc-notes">Notes</Label>
            <Textarea
              id="kc-notes"
              name="notes"
              rows={2}
              defaultValue={contact?.notes ?? ""}
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
