"use client";

import { useTransition } from "react";
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
import { useUIStore } from "@/stores/ui-store";
import { removeVehicle } from "@/app/(app)/operations/vehicles/actions";

export function DeleteVehicleDialog() {
  const { vehicleToDelete, clearDeleteVehicle } = useUIStore();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!vehicleToDelete) return;
    const id = vehicleToDelete.id;
    startTransition(async () => {
      const result = await removeVehicle(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Vehicle removed.");
      clearDeleteVehicle();
    });
  }

  return (
    <Dialog
      open={vehicleToDelete !== null}
      onOpenChange={(open) => !open && clearDeleteVehicle()}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove vehicle?</DialogTitle>
          <DialogDescription>
            {vehicleToDelete ? (
              <>
                This permanently deletes{" "}
                <span className="font-medium text-foreground">
                  {vehicleToDelete.plate_number}
                </span>{" "}
                along with its routes and expenses. This cannot be undone.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={clearDeleteVehicle}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            {isPending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
