"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAccount } from "@/app/(app)/settings/actions";
import { purgeLocalData } from "@/lib/offline/cache";

export function DangerZone({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      // Purge cached pages and queued writes first: the action redirects on
      // success, and anything left behind would outlive the account itself.
      await purgeLocalData();
      // On success the action redirects; only errors return here.
      const result = await deleteAccount();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Card className="border-expense/40">
      <CardHeader>
        <CardTitle className="text-expense">Delete account</CardTitle>
        <CardDescription>
          Permanently delete your account and all vehicles, routes, expenses,
          and receipts. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This is permanent. Type your email{" "}
              <span className="font-medium text-foreground">{email}</span> to
              confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-email" className="sr-only">
              Confirm email
            </Label>
            <Input
              id="confirm-email"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={email}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending || confirmText !== email}
            >
              {isPending && <Loader2 className="animate-spin" aria-hidden />}
              {isPending ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
