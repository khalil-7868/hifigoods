"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Confirmation gate for destructive actions.
 *
 * Deleting a party or broker takes months of ledger history with it, so the
 * dialog states plainly what is about to be lost. Cancel is the default focus
 * and the primary action carries the destructive variant, never the reverse.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  onConfirm,
  pending = false,
  variant = "destructive",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  variant?: "destructive" | "default";
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let an in-flight delete be dismissed out from under itself.
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
