"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Gauge, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateVehicleOdometer } from "@/app/(app)/operations/tyres/actions";
import { cn } from "@/lib/utils";

/**
 * Inline odometer editor on the vehicle group header.
 *
 * Every km-life and cost-per-km figure on this page is derived from the
 * vehicle's current odometer, so if it's never recorded the entire feature
 * shows nothing useful. Putting the control right where the missing number is
 * needed beats hiding it in the vehicle edit form.
 */
export function OdometerField({
  vehicleId,
  odometer,
}: {
  vehicleId: string;
  odometer: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(odometer || ""));
  const [isPending, startTransition] = useTransition();

  const missing = !odometer;

  function save() {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) {
      toast.error("Enter a valid odometer reading.");
      return;
    }
    startTransition(async () => {
      const result = await updateVehicleOdometer(vehicleId, next);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Odometer updated.");
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent",
          missing ? "text-warning" : "text-muted-foreground",
        )}
      >
        <Gauge className="size-3.5" aria-hidden />
        {missing
          ? "Set odometer"
          : `${odometer.toLocaleString("en-PK")} km`}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") setEditing(false);
        }}
        aria-label="Current odometer reading in kilometres"
        className="h-8 w-32"
        autoFocus
      />
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label="Save odometer"
        onClick={save}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label="Cancel"
        onClick={() => setEditing(false)}
        disabled={isPending}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
