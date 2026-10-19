"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addMechanic,
  deleteMechanic,
  type ActionResult,
} from "@/app/(app)/operations/maintenance/actions";
import type { Mechanic } from "@/lib/database.types";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Plus aria-hidden />
      )}
      {pending ? "Adding…" : "Add"}
    </Button>
  );
}

/** Manage the list of mechanics/workshops available on the maintenance sheet. */
export function MechanicDialog({
  open,
  onOpenChange,
  mechanics,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mechanics: Mechanic[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    addMechanic,
    {},
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.success) {
      toast.success("Mechanic added.");
      formRef.current?.reset();
    }
  }, [state]);

  function handleDelete(id: string) {
    startDelete(async () => {
      const result = await deleteMechanic(id);
      if (result.error) toast.error(result.error);
      else toast.success("Mechanic removed.");
      setConfirmingId(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5" aria-hidden />
            Mechanics
          </DialogTitle>
          <DialogDescription>
            Workshops you pay for monthly servicing. Pick one per vehicle on the
            maintenance sheet.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mech-name">Name</Label>
              <Input id="mech-name" name="name" placeholder="Ustaad Akram" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mech-workshop">Workshop</Label>
              <Input
                id="mech-workshop"
                name="workshop"
                placeholder="Akram Auto Works"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mech-phone">Phone</Label>
              <Input id="mech-phone" name="phone" placeholder="03xx-xxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mech-city">City</Label>
              <Input id="mech-city" name="city" placeholder="Rahim Yar Khan" />
            </div>
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-expense">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <AddButton />
          </div>
        </form>

        {mechanics.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Workshop</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mechanics.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.workshop ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    {/* Inline two-step confirm: this list already lives inside
                        a Dialog, and nesting modals breaks focus trapping. */}
                    {confirmingId === m.id ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingId(null)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(m.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting && (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          )}
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => setConfirmingId(m.id)}
                        className="text-muted-foreground hover:text-expense"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
