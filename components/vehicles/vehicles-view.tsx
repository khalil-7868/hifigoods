"use client";

import { Truck } from "lucide-react";
import { EntityList, type Column } from "@/components/entity/entity-list";
import { RowActions } from "@/components/entity/row-actions";
import { StatusBadge } from "@/components/vehicles/status-badge";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import { DeleteVehicleDialog } from "@/components/vehicles/delete-vehicle-dialog";
import { useUIStore } from "@/stores/ui-store";
import { useNewParam } from "@/lib/use-new-param";
import { formatDate } from "@/lib/format";
import type { Vehicle } from "@/lib/database.types";

export function VehiclesView({
  vehicles,
  totalCount,
  query = "",
}: {
  vehicles: Vehicle[];
  /** Fleet size before the ?q= filter, so the subtitle stays truthful. */
  totalCount?: number;
  query?: string;
}) {
  const { openAddVehicle, requestDeleteVehicle } = useUIStore();
  useNewParam(openAddVehicle);

  const total = totalCount ?? vehicles.length;

  const columns: Column<Vehicle>[] = [
    {
      header: "Plate",
      cell: (v) => v.plate_number,
      className: "font-medium",
    },
    {
      header: "Make & model",
      cell: (v) => v.make_model ?? "—",
      className: "text-muted-foreground",
    },
    {
      header: "Status",
      cell: (v) => <StatusBadge status={v.status} />,
    },
    {
      header: "Added",
      cell: (v) => formatDate(v.created_at),
      className: "text-muted-foreground",
    },
  ];

  return (
    <EntityList
      title="Vehicles"
      description={`${total} vehicle${total === 1 ? "" : "s"} in your fleet.`}
      icon={Truck}
      items={vehicles}
      totalCount={total}
      keyOf={(v) => v.id}
      query={query}
      searchPlaceholder="Search by plate, model or status"
      createLabel="Add vehicle"
      onCreate={openAddVehicle}
      columns={columns}
      rowActions={(v) => (
        <RowActions
          name={v.plate_number}
          onDelete={() => requestDeleteVehicle(v)}
        />
      )}
      renderCard={(v) => (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{v.plate_number}</p>
            <p className="truncate text-xs text-muted-foreground">
              {v.make_model ?? "—"} · added {formatDate(v.created_at)}
            </p>
            <div className="mt-2">
              <StatusBadge status={v.status} />
            </div>
          </div>
          <div className="flex shrink-0">
            <RowActions
              name={v.plate_number}
              onDelete={() => requestDeleteVehicle(v)}
            />
          </div>
        </div>
      )}
    >
      <AddVehicleDialog />
      <DeleteVehicleDialog />
    </EntityList>
  );
}
