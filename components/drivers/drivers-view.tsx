"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EntityList, type Column } from "@/components/entity/entity-list";
import { RowActions } from "@/components/entity/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DriverDialog } from "@/components/drivers/driver-dialog";
import { deleteDriver } from "@/app/(app)/ledgers/drivers/actions";
import { useNewParam } from "@/lib/use-new-param";
import { formatCurrency, formatDate } from "@/lib/format";
import { PATHS } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { DriverVM } from "@/lib/drivers-data";

export function DriversView({
  drivers,
  allDrivers,
  query = "",
}: {
  drivers: DriverVM[];
  allDrivers?: DriverVM[];
  query?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DriverVM | null>(null);
  const [confirming, setConfirming] = useState<DriverVM | null>(null);
  const [isDeleting, startDelete] = useTransition();

  useNewParam(() => setAddOpen(true));

  const book = allDrivers ?? drivers;
  const totalOutstanding = book.reduce((s, d) => s + d.outstanding, 0);

  function handleDelete() {
    const driver = confirming;
    if (!driver) return;
    startDelete(async () => {
      const result = await deleteDriver(driver.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${driver.name} deleted.`);
        setConfirming(null);
      }
    });
  }

  const columns: Column<DriverVM>[] = [
    {
      header: "Driver",
      cell: (d) => (
        <>
          <Link
            href={PATHS.driver(d.id)}
            className="font-medium hover:underline"
          >
            {d.name}
          </Link>
          <span className="block text-xs text-muted-foreground">
            {d.tripCount} trip{d.tripCount === 1 ? "" : "s"}
            {!d.active && " · inactive"}
            {d.openAdvances > 0 && (
              <>
                {" · "}
                <span className="text-expense">{d.openAdvances} open</span>
              </>
            )}
          </span>
        </>
      ),
    },
    {
      header: "Phone",
      cell: (d) => d.phone ?? "—",
      className: "whitespace-nowrap text-muted-foreground",
    },
    {
      header: "Last trip",
      cell: (d) => (d.lastTrip ? formatDate(d.lastTrip) : "—"),
      className: "whitespace-nowrap text-muted-foreground",
    },
    {
      header: "Given",
      align: "right",
      cell: (d) => formatCurrency(d.given),
      className: "tabular-nums",
    },
    {
      header: "Returned",
      align: "right",
      cell: (d) => formatCurrency(d.returned),
      className: "tabular-nums text-profit",
    },
    {
      header: "Outstanding",
      align: "right",
      cell: (d) => (
        <span
          className={cn(
            "font-semibold tabular-nums",
            d.outstanding > 0 ? "text-expense" : "text-profit",
          )}
        >
          {formatCurrency(d.outstanding)}
        </span>
      ),
    },
  ];

  return (
    <EntityList
      title="Drivers"
      description="Who drives each trip, and what peshgi they still hold."
      icon={UserCog}
      items={drivers}
      totalCount={book.length}
      keyOf={(d) => d.id}
      query={query}
      searchPlaceholder="Search drivers by name, phone or CNIC"
      createLabel="Add driver"
      onCreate={() => setAddOpen(true)}
      tiles={[
        { label: "Drivers", value: String(book.length) },
        {
          label: "Currently employed",
          value: String(book.filter((d) => d.active).length),
        },
        {
          label: "Peshgi outstanding",
          value: formatCurrency(totalOutstanding),
          tone: totalOutstanding > 0 ? "expense" : "profit",
        },
      ]}
      columns={columns}
      detailHref={(d) => PATHS.driver(d.id)}
      rowActions={(d) => (
        <RowActions
          name={d.name}
          onEdit={() => setEditing(d)}
          onDelete={() => setConfirming(d)}
          pending={isDeleting && confirming?.id === d.id}
        />
      )}
      renderCard={(d) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={PATHS.driver(d.id)}
                className="font-medium hover:underline"
              >
                {d.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {d.tripCount} trip{d.tripCount === 1 ? "" : "s"}
                {d.phone ? ` · ${d.phone}` : ""}
              </p>
              {!d.active && (
                <Badge variant="outline" className="mt-1">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  d.outstanding > 0 ? "text-expense" : "text-profit",
                )}
              >
                {formatCurrency(d.outstanding)}
              </p>
              <p className="text-xs text-muted-foreground">peshgi</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {d.lastTrip ? `Last trip ${formatDate(d.lastTrip)}` : "No trips yet"}
            </p>
            <div className="flex shrink-0">
              <RowActions
                name={d.name}
                onEdit={() => setEditing(d)}
                onDelete={() => setConfirming(d)}
                pending={isDeleting && confirming?.id === d.id}
              />
            </div>
          </div>
        </>
      )}
    >
      <DriverDialog open={addOpen} onOpenChange={setAddOpen} />
      <DriverDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        driver={editing}
      />

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Delete ${confirming?.name ?? "driver"}?`}
        description={
          confirming ? (
            <>
              This permanently deletes {confirming.name} and every peshgi record
              against them. Their {confirming.tripCount} trip
              {confirming.tripCount === 1 ? "" : "s"} stay, but lose the driver
              link, and {formatCurrency(confirming.outstanding)} outstanding will
              no longer be tracked. If they have simply left, mark them inactive
              instead. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete driver"
        onConfirm={handleDelete}
        pending={isDeleting}
      />
    </EntityList>
  );
}
