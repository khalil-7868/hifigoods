"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CircleDot,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { TyreDialog } from "@/components/tyres/tyre-dialog";
import { OdometerField } from "@/components/tyres/odometer-field";
import {
  deleteTyre,
  restoreTyre,
  setTyreStatus,
} from "@/app/(app)/operations/tyres/actions";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { useNewParam } from "@/lib/use-new-param";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LIFE_KM,
  TYRE_STATUSES,
  TYRE_STATUS_LABEL,
  type TyresPage,
  type TyreVM,
} from "@/lib/tyres";
import type { TyreStatus, Vehicle } from "@/lib/database.types";

const STATUS_VARIANT: Record<
  TyreStatus,
  "profit" | "expense" | "secondary" | "outline"
> = {
  in_use: "profit",
  spare: "secondary",
  retreaded: "outline",
  scrapped: "expense",
};

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "expense";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            tone === "profit" && "text-profit",
            tone === "expense" && "text-expense",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/** Null means the reading is unknown, not zero — never render it as 0. */
function formatKm(km: number | null): string {
  return km === null ? "—" : `${km.toLocaleString("en-PK")} km`;
}

export function TyresView({
  data,
  tyres,
  query = "",
}: {
  data: TyresPage;
  /** Rows after the ?q= filter. */
  tyres: TyreVM[];
  query?: string;
}) {
  const { vehicles, totals } = data;
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TyreVM | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBusy, startBusy] = useTransition();

  useNewParam(() => vehicles.length > 0 && setAddOpen(true));

  const { remove, isPending: isDeleting } = useUndoableDelete({
    onDelete: deleteTyre,
    onRestore: restoreTyre,
    deletedMessage: (row) =>
      row
        ? `Tyre${row.serial_no ? ` ${row.serial_no}` : ""} deleted.`
        : "Tyre deleted.",
    restoredMessage: "Tyre restored.",
  });

  function handleStatus(tyre: TyreVM, status: TyreStatus) {
    const vehicle = vehicles.find((v) => v.id === tyre.vehicle_id);
    startBusy(async () => {
      const result = await setTyreStatus(
        tyre.id,
        status,
        Number(vehicle?.odometer ?? 0),
      );
      if (result.error) toast.error(result.error);
      else toast.success(`Marked ${TYRE_STATUS_LABEL[status].toLowerCase()}.`);
    });
  }

  // Group by vehicle: a tyre only means anything in the context of its truck.
  const byVehicle = new Map<string, TyreVM[]>();
  for (const t of tyres) {
    const list = byVehicle.get(t.vehicle_id) ?? [];
    list.push(t);
    byVehicle.set(t.vehicle_id, list);
  }

  const isSearching = query.length > 0;
  const noVehicles = vehicles.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tyres</h1>
          <p className="text-sm text-muted-foreground">
            Lifecycle and km life per vehicle, so replacements stop being a
            surprise.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={noVehicles}>
          <Plus aria-hidden />
          Add tyre
        </Button>
      </header>

      {noVehicles ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No vehicles yet"
            description="Tyres belong to a vehicle — add one first."
          />
        </Card>
      ) : (
        <>
          <section aria-label="Tyre totals" className="grid gap-4 sm:grid-cols-4">
            <Tile label="Tyres tracked" value={String(totals.count)} />
            <Tile label="In use or spare" value={String(totals.active)} />
            <Tile
              label="Past service life"
              value={String(totals.needsAttention)}
              tone={totals.needsAttention > 0 ? "expense" : "profit"}
            />
            <Tile label="Total invested" value={formatCurrency(totals.invested)} />
          </section>

          {totals.missingOdometer > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <Gauge
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden
              />
              <p className="text-sm">
                {totals.missingOdometer} vehicle
                {totals.missingOdometer === 1 ? " has" : "s have"} no odometer
                reading, so km life and cost per km can&apos;t be worked out for
                their tyres. Set it on the vehicle heading below.
              </p>
            </div>
          )}

          {totals.needsAttention > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden
              />
              <p className="text-sm">
                {totals.needsAttention} tyre
                {totals.needsAttention === 1 ? " has" : "s have"} passed{" "}
                {formatKm(DEFAULT_LIFE_KM)} in service. Worth inspecting before
                the next long run.
              </p>
            </div>
          )}

          {totals.count > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                className="w-full sm:max-w-xs"
                placeholder="Search by brand, size, serial or position"
              />
              {isSearching && (
                <p className="text-sm text-muted-foreground" role="status">
                  {tyres.length} of {totals.count}
                </p>
              )}
            </div>
          )}

          {totals.count === 0 ? (
            <Card>
              <EmptyState
                icon={CircleDot}
                title="No tyres tracked yet"
                description="Add a tyre to start tracking km life and cost per kilometre."
                action={
                  <Button variant="outline" onClick={() => setAddOpen(true)}>
                    <Plus aria-hidden />
                    Add tyre
                  </Button>
                }
              />
            </Card>
          ) : tyres.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title="No matching tyres"
                description={`Nothing matches "${query}". Try a shorter search, or check the spelling.`}
              />
            </Card>
          ) : (
            vehicles
              .filter((v) => (byVehicle.get(v.id) ?? []).length > 0)
              .map((vehicle) => (
                <VehicleTyres
                  key={vehicle.id}
                  vehicle={vehicle}
                  tyres={byVehicle.get(vehicle.id) ?? []}
                  onEdit={setEditing}
                  onStatus={handleStatus}
                  onDelete={(t) => {
                    setDeletingId(t.id);
                    remove(t.id);
                  }}
                  busy={isBusy}
                  deletingId={isDeleting ? deletingId : null}
                />
              ))
          )}
        </>
      )}

      <TyreDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        vehicles={vehicles}
      />
      <TyreDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        vehicles={vehicles}
        tyre={editing}
      />
    </div>
  );
}

function VehicleTyres({
  vehicle,
  tyres,
  onEdit,
  onStatus,
  onDelete,
  busy,
  deletingId,
}: {
  vehicle: Vehicle;
  tyres: TyreVM[];
  onEdit: (t: TyreVM) => void;
  onStatus: (t: TyreVM, s: TyreStatus) => void;
  onDelete: (t: TyreVM) => void;
  busy: boolean;
  deletingId: string | null;
}) {
  const invested = tyres.reduce((s, t) => s + Number(t.purchase_cost), 0);

  return (
    <Card>
      <CardHeader className="gap-1 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{vehicle.plate_number}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {tyres.length} tyre{tyres.length === 1 ? "" : "s"} ·{" "}
            {formatCurrency(invested)} invested
          </p>
        </div>
        <OdometerField
          vehicleId={vehicle.id}
          odometer={Number(vehicle.odometer)}
        />
      </CardHeader>

      <CardContent className="p-0">
        {/* Mobile: card per tyre. */}
        <ul className="divide-y md:hidden">
          {tyres.map((t) => (
            <li key={t.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {t.position ?? "Unassigned position"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[t.brand, t.size, t.serial_no].filter(Boolean).join(" · ") ||
                      "No details"}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[t.status]}>
                  {TYRE_STATUS_LABEL[t.status]}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "tabular-nums",
                      t.needsAttention && "font-medium text-warning",
                    )}
                  >
                    {formatKm(t.kmRun)}
                  </span>
                  {t.costPerKm !== null &&
                    ` · ${formatCurrency(t.costPerKm)}/km`}
                </p>
                <TyreActions
                  tyre={t}
                  onEdit={onEdit}
                  onStatus={onStatus}
                  onDelete={onDelete}
                  busy={busy}
                  deletingId={deletingId}
                />
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: table. */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Brand &amp; size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fitted</TableHead>
                <TableHead className="text-right">Km run</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Per km</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tyres.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.position ?? "—"}
                    {t.retread_count > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        retreaded {t.retread_count}×
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[t.brand, t.size].filter(Boolean).join(" · ") || "—"}
                    {t.serial_no && (
                      <span className="block text-xs">#{t.serial_no}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[t.status]}>
                      {TYRE_STATUS_LABEL[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(t.purchase_date)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      t.needsAttention && "font-medium text-warning",
                    )}
                  >
                    {formatKm(t.kmRun)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(t.purchase_cost))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {t.costPerKm !== null ? formatCurrency(t.costPerKm) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <TyreActions
                        tyre={t}
                        onEdit={onEdit}
                        onStatus={onStatus}
                        onDelete={onDelete}
                        busy={busy}
                        deletingId={deletingId}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TyreActions({
  tyre,
  onEdit,
  onStatus,
  onDelete,
  busy,
  deletingId,
}: {
  tyre: TyreVM;
  onEdit: (t: TyreVM) => void;
  onStatus: (t: TyreVM, s: TyreStatus) => void;
  onDelete: (t: TyreVM) => void;
  busy: boolean;
  deletingId: string | null;
}) {
  const isDeleting = deletingId === tyre.id;

  return (
    <div className="flex gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            aria-label={`Change status for ${tyre.position ?? "tyre"}`}
          >
            Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {TYRE_STATUSES.filter((s) => s !== tyre.status).map((s) => (
            <DropdownMenuItem key={s} onSelect={() => onStatus(tyre, s)}>
              {TYRE_STATUS_LABEL[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${tyre.position ?? "tyre"}`}
        onClick={() => onEdit(tyre)}
      >
        <Pencil className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-expense"
        aria-label={`Delete ${tyre.position ?? "tyre"}`}
        disabled={isDeleting}
        onClick={() => onDelete(tyre)}
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
    </div>
  );
}
