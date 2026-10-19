"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { EntityList, type Column } from "@/components/entity/entity-list";
import { RowActions } from "@/components/entity/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PartyDialog } from "@/components/parties/party-dialog";
import { deleteParty } from "@/app/(app)/ledgers/parties/actions";
import { useNewParam } from "@/lib/use-new-param";
import { formatCurrency } from "@/lib/format";
import { PATHS } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PartyVM } from "@/lib/parties-data";

export function PartiesView({
  parties,
  allParties,
  query = "",
}: {
  /** Rows after the ?q= filter — what the list renders. */
  parties: PartyVM[];
  /** Every party, so the summary tiles stay stable while searching. */
  allParties?: PartyVM[];
  query?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PartyVM | null>(null);
  const [confirming, setConfirming] = useState<PartyVM | null>(null);
  const [isDeleting, startDelete] = useTransition();

  useNewParam(() => setAddOpen(true));

  // Totals stay scoped to the full book: a search narrows the list, it must not
  // make the receivables summary look like money disappeared.
  const book = allParties ?? parties;

  function handleDelete() {
    const party = confirming;
    if (!party) return;
    startDelete(async () => {
      const result = await deleteParty(party.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${party.name} deleted.`);
        setConfirming(null);
      }
    });
  }

  const columns: Column<PartyVM>[] = [
    {
      header: "Party",
      cell: (p) => (
        <>
          <Link href={PATHS.party(p.id)} className="font-medium hover:underline">
            {p.name}
          </Link>
          <span className="block text-xs text-muted-foreground">
            {p.routeCount} route{p.routeCount === 1 ? "" : "s"}
            {p.phone ? ` · ${p.phone}` : ""}
          </span>
        </>
      ),
    },
    {
      header: "City",
      cell: (p) => p.city ?? "—",
      className: "text-muted-foreground",
    },
    {
      header: "Billed",
      align: "right",
      cell: (p) => formatCurrency(p.billed),
      className: "tabular-nums",
    },
    {
      header: "Received",
      align: "right",
      cell: (p) => formatCurrency(p.received),
      className: "tabular-nums text-profit",
    },
    {
      header: "Balance",
      align: "right",
      cell: (p) => (
        <span
          className={cn(
            "font-semibold tabular-nums",
            p.balance > 0 ? "text-expense" : "text-profit",
          )}
        >
          {formatCurrency(p.balance)}
        </span>
      ),
    },
  ];

  return (
    <EntityList
      title="Parties"
      description="Clients you bill for freight, and what they owe you."
      icon={Users}
      items={parties}
      totalCount={book.length}
      keyOf={(p) => p.id}
      query={query}
      searchPlaceholder="Search parties by name, city or phone"
      createLabel="Add party"
      onCreate={() => setAddOpen(true)}
      tiles={[
        {
          label: "Total billed",
          value: formatCurrency(book.reduce((s, p) => s + p.billed, 0)),
        },
        {
          label: "Received",
          value: formatCurrency(book.reduce((s, p) => s + p.received, 0)),
          tone: "profit",
        },
        {
          label: "Outstanding",
          value: formatCurrency(book.reduce((s, p) => s + p.balance, 0)),
          tone:
            book.reduce((s, p) => s + p.balance, 0) > 0 ? "expense" : "profit",
        },
      ]}
      columns={columns}
      detailHref={(p) => PATHS.party(p.id)}
      rowActions={(p) => (
        <RowActions
          name={p.name}
          onEdit={() => setEditing(p)}
          onDelete={() => setConfirming(p)}
          pending={isDeleting && confirming?.id === p.id}
        />
      )}
      renderCard={(p) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={PATHS.party(p.id)}
                className="font-medium hover:underline"
              >
                {p.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {p.routeCount} route{p.routeCount === 1 ? "" : "s"}
                {p.city ? ` · ${p.city}` : ""}
                {p.phone ? ` · ${p.phone}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  p.balance > 0 ? "text-expense" : "text-profit",
                )}
              >
                {formatCurrency(p.balance)}
              </p>
              <p className="text-xs text-muted-foreground">outstanding</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Billed {formatCurrency(p.billed)} · Received{" "}
              <span className="text-profit">{formatCurrency(p.received)}</span>
            </p>
            <div className="flex shrink-0">
              <RowActions
                name={p.name}
                onEdit={() => setEditing(p)}
                onDelete={() => setConfirming(p)}
                pending={isDeleting && confirming?.id === p.id}
              />
            </div>
          </div>
        </>
      )}
    >
      <PartyDialog open={addOpen} onOpenChange={setAddOpen} />
      <PartyDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        party={editing}
      />

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Delete ${confirming?.name ?? "party"}?`}
        description={
          confirming ? (
            <>
              This permanently deletes {confirming.name}, their{" "}
              {confirming.routeCount} linked route
              {confirming.routeCount === 1 ? "" : "s"} assignment and every
              payment recorded against them. An outstanding balance of{" "}
              {formatCurrency(confirming.balance)} will no longer be tracked.
              This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete party"
        onConfirm={handleDelete}
        pending={isDeleting}
      />
    </EntityList>
  );
}
