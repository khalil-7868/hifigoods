"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EntityList, type Column } from "@/components/entity/entity-list";
import { RowActions } from "@/components/entity/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BrokerDialog } from "@/components/brokers/broker-dialog";
import { deleteBroker } from "@/app/(app)/ledgers/brokers/actions";
import { useNewParam } from "@/lib/use-new-param";
import { formatCurrency } from "@/lib/format";
import { PATHS } from "@/lib/routes";
import type { BrokerVM } from "@/lib/brokers";

export function BrokersView({
  brokers,
  allBrokers,
  query = "",
}: {
  brokers: BrokerVM[];
  allBrokers?: BrokerVM[];
  query?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BrokerVM | null>(null);
  const [confirming, setConfirming] = useState<BrokerVM | null>(null);
  const [isDeleting, startDelete] = useTransition();

  useNewParam(() => setAddOpen(true));

  const book = allBrokers ?? brokers;
  const totalBalance = book.reduce((s, b) => s + b.balance, 0);

  function handleDelete() {
    const broker = confirming;
    if (!broker) return;
    startDelete(async () => {
      const result = await deleteBroker(broker.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${broker.name} deleted.`);
        setConfirming(null);
      }
    });
  }

  const columns: Column<BrokerVM>[] = [
    {
      header: "Broker",
      cell: (b) => (
        <>
          <Link
            href={PATHS.broker(b.id)}
            className="font-medium hover:underline"
          >
            {b.name}
          </Link>
          <span className="block text-xs text-muted-foreground">
            {b.legCount} leg{b.legCount === 1 ? "" : "s"}
            {b.unpaidCount > 0 && (
              <>
                {" · "}
                <span className="text-expense">{b.unpaidCount} unpaid</span>
              </>
            )}
            {b.city ? ` · ${b.city}` : ""}
          </span>
        </>
      ),
    },
    {
      header: "Phone",
      cell: (b) => b.phone ?? "—",
      className: "whitespace-nowrap text-muted-foreground",
    },
    {
      header: "Rent",
      align: "right",
      cell: (b) => formatCurrency(b.rent),
      className: "tabular-nums",
    },
    {
      header: "Commission",
      align: "right",
      cell: (b) => formatCurrency(b.commission),
      className: "tabular-nums text-muted-foreground",
    },
    {
      header: "Received",
      align: "right",
      cell: (b) => formatCurrency(b.received),
      className: "tabular-nums text-profit",
    },
    {
      header: "Balance",
      align: "right",
      cell: (b) => (
        <Badge
          variant={b.balance > 0 ? "expense" : "profit"}
          className="tabular-nums"
        >
          {formatCurrency(b.balance)}
        </Badge>
      ),
    },
  ];

  return (
    <EntityList
      title="Brokers"
      description="Who arranged each load, and how much rent they still owe you."
      icon={Handshake}
      items={brokers}
      totalCount={book.length}
      keyOf={(b) => b.id}
      query={query}
      searchPlaceholder="Search brokers by name, city or phone"
      createLabel="Add broker"
      onCreate={() => setAddOpen(true)}
      tiles={[
        {
          label: "Rent due (net of commission)",
          value: formatCurrency(book.reduce((s, b) => s + b.owed, 0)),
        },
        {
          label: "Received",
          value: formatCurrency(book.reduce((s, b) => s + b.received, 0)),
          tone: "profit",
        },
        {
          label: "Outstanding",
          value: formatCurrency(totalBalance),
          tone: totalBalance > 0 ? "expense" : "profit",
        },
      ]}
      columns={columns}
      detailHref={(b) => PATHS.broker(b.id)}
      rowActions={(b) => (
        <RowActions
          name={b.name}
          onEdit={() => setEditing(b)}
          onDelete={() => setConfirming(b)}
          pending={isDeleting && confirming?.id === b.id}
        />
      )}
      renderCard={(b) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={PATHS.broker(b.id)}
                className="font-medium hover:underline"
              >
                {b.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {b.legCount} leg{b.legCount === 1 ? "" : "s"}
                {b.city ? ` · ${b.city}` : ""}
                {b.phone ? ` · ${b.phone}` : ""}
              </p>
              {b.unpaidCount > 0 && (
                <p className="mt-1 text-xs text-expense">
                  {b.unpaidCount} unpaid
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <Badge
                variant={b.balance > 0 ? "expense" : "profit"}
                className="tabular-nums"
              >
                {formatCurrency(b.balance)}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">outstanding</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Rent {formatCurrency(b.rent)} · Comm{" "}
              {formatCurrency(b.commission)}
            </p>
            <div className="flex shrink-0">
              <RowActions
                name={b.name}
                onEdit={() => setEditing(b)}
                onDelete={() => setConfirming(b)}
                pending={isDeleting && confirming?.id === b.id}
              />
            </div>
          </div>
        </>
      )}
    >
      <BrokerDialog open={addOpen} onOpenChange={setAddOpen} />
      <BrokerDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        broker={editing}
      />

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Delete ${confirming?.name ?? "broker"}?`}
        description={
          confirming ? (
            <>
              This permanently deletes {confirming.name} and every settlement
              recorded against them. Their {confirming.legCount} leg
              {confirming.legCount === 1 ? "" : "s"} stay, but lose their broker
              link — and an outstanding balance of{" "}
              {formatCurrency(confirming.balance)} will no longer be tracked.
              This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete broker"
        onConfirm={handleDelete}
        pending={isDeleting}
      />
    </EntityList>
  );
}
