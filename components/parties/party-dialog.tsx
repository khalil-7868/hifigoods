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
import { addParty, updateParty, type ActionResult } from "@/app/(app)/ledgers/parties/actions";
import type { Party } from "@/lib/database.types";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : editing ? "Save party" : "Add party"}
    </Button>
  );
}

export function PartyDialog({
  open,
  onOpenChange,
  party,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party?: Party | null;
}) {
  const editing = !!party;
  const action: (p: ActionResult, f: FormData) => Promise<ActionResult> = party
    ? updateParty.bind(null, party.id)
    : addParty;

  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});

  useEffect(() => {
    if (state.success) {
      toast.success(editing ? "Party updated." : "Party added.");
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit party" : "Add party"}</DialogTitle>
          <DialogDescription>
            A party is a client you bill for freight.
          </DialogDescription>
        </DialogHeader>

        <form key={party?.id ?? "new"} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="party-name">Name</Label>
            <Input
              id="party-name"
              name="name"
              placeholder="Al-Karam Traders"
              defaultValue={party?.name ?? ""}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="party-phone">Phone</Label>
              <Input
                id="party-phone"
                name="phone"
                placeholder="03xx-xxxxxxx"
                defaultValue={party?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-city">City</Label>
              <Input
                id="party-city"
                name="city"
                placeholder="Karachi"
                defaultValue={party?.city ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="party-opening">Opening balance (PKR)</Label>
            <AmountInput
              id="party-opening"
              name="opening_balance"
              placeholder="0"
              allowNegative
              defaultValue={party?.opening_balance ?? 0}
            />
            <p className="text-xs text-muted-foreground">
              What they already owed you before you started using HiFiGoods.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="party-notes">Notes</Label>
            <Textarea
              id="party-notes"
              name="notes"
              rows={2}
              defaultValue={party?.notes ?? ""}
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
