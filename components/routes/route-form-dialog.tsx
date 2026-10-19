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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUIStore } from "@/stores/ui-store";
import {
  addRoute,
  updateRoute,
  type ActionResult,
} from "@/app/(app)/operations/routes/actions";
import { BrokerFields } from "@/components/routes/broker-fields";
import { asBrokerCommissionType } from "@/lib/database.types";
import { todayISO } from "@/lib/format";
import type { Broker, Driver, Party, Vehicle } from "@/lib/database.types";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : editing ? "Save changes" : "Add route"}
    </Button>
  );
}

export function RouteFormDialog({
  vehicles,
  parties = [],
  brokers = [],
  drivers = [],
}: {
  vehicles: Vehicle[];
  parties?: Party[];
  brokers?: Broker[];
  drivers?: Driver[];
}) {
  const {
    isAddRouteOpen,
    closeAddRoute,
    routeToEdit,
    setRouteToEdit,
  } = useUIStore();

  const editing = routeToEdit !== null;
  const open = isAddRouteOpen || editing;

  // Narrow on `routeToEdit` directly so TS knows `.id` is defined.
  const action: (p: ActionResult, f: FormData) => Promise<ActionResult> =
    routeToEdit ? updateRoute.bind(null, routeToEdit.id) : addRoute;

  const [state, formAction] = useActionState<ActionResult, FormData>(
    action,
    {},
  );

  function close() {
    closeAddRoute();
    setRouteToEdit(null);
  }

  useEffect(() => {
    if (state.success) {
      toast.success(editing ? "Route updated." : "Route added.");
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const today = todayISO();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit route" : "Add route"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this trip's details."
              : "Log a new trip and its revenue."}
          </DialogDescription>
        </DialogHeader>

        {vehicles.length === 0 ? (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-foreground">
            Add a vehicle first before creating a route.
          </p>
        ) : (
          <form
            key={routeToEdit?.id ?? "new"}
            action={formAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="vehicle_id">Vehicle</Label>
              <Select
                name="vehicle_id"
                defaultValue={routeToEdit?.vehicle_id ?? vehicles[0]?.id}
              >
                <SelectTrigger id="vehicle_id">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number}
                      {v.make_model ? ` · ${v.make_model}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Input
                  id="origin"
                  name="origin"
                  placeholder="Chicago, IL"
                  defaultValue={routeToEdit?.origin ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="Denver, CO"
                  defaultValue={routeToEdit?.destination ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={routeToEdit?.start_date ?? today}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={routeToEdit?.end_date ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="revenue">Revenue</Label>
                <AmountInput
                  id="revenue"
                  name="revenue"
                  placeholder="0"
                  defaultValue={routeToEdit?.revenue ?? ""}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="party_id">Party (billed for this trip)</Label>
              <Select
                name="party_id"
                defaultValue={routeToEdit?.party_id ?? "none"}
              >
                <SelectTrigger id="party_id">
                  <SelectValue placeholder="No party" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No party</SelectItem>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.city ? ` · ${p.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parties.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No parties yet — add one under Parties to build a ledger.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver_id">Driver</Label>
              <Select
                name="driver_id"
                defaultValue={routeToEdit?.driver_id ?? "none"}
              >
                <SelectTrigger id="driver_id">
                  <SelectValue placeholder="No driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No driver</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.phone ? ` · ${d.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {drivers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active drivers — add one under Drivers to track peshgi
                  against this trip.
                </p>
              )}
            </div>

            <BrokerFields
              brokers={brokers}
              idPrefix={`route-${routeToEdit?.id ?? "new"}`}
              defaultBrokerId={routeToEdit?.broker_id}
              defaultType={asBrokerCommissionType(
                routeToEdit?.broker_commission_type,
              )}
              defaultValue={routeToEdit?.broker_commission_value}
            />

            {state.error && (
              <p role="alert" className="text-sm text-expense">
                {state.error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <SubmitButton editing={editing} />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
