"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BookUser } from "lucide-react";
import { EntityList, type Column } from "@/components/entity/entity-list";
import { RowActions } from "@/components/entity/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KhataContactDialog } from "@/components/khata/khata-contact-dialog";
import { deleteKhataContact } from "@/app/(app)/ledgers/khata/actions";
import { useNewParam } from "@/lib/use-new-param";
import { balanceLabel, type KhataContactVM } from "@/lib/khata";
import { formatCurrency } from "@/lib/format";
import { PATHS } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Positive = they owe you, negative = you owe them, zero = settled. */
function balanceTone(balance: number): string {
  if (balance > 0) return "text-profit";
  if (balance < 0) return "text-expense";
  return "";
}

export function KhataView({
  contacts,
  allContacts,
  query = "",
}: {
  contacts: KhataContactVM[];
  allContacts?: KhataContactVM[];
  query?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<KhataContactVM | null>(null);
  const [confirming, setConfirming] = useState<KhataContactVM | null>(null);
  const [isDeleting, startDelete] = useTransition();

  useNewParam(() => setAddOpen(true));

  const book = allContacts ?? contacts;
  const willGet = book
    .filter((c) => c.balance > 0)
    .reduce((s, c) => s + c.balance, 0);
  const willGive = book
    .filter((c) => c.balance < 0)
    .reduce((s, c) => s + Math.abs(c.balance), 0);

  function handleDelete() {
    const contact = confirming;
    if (!contact) return;
    startDelete(async () => {
      const result = await deleteKhataContact(contact.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${contact.name} deleted.`);
        setConfirming(null);
      }
    });
  }

  const columns: Column<KhataContactVM>[] = [
    {
      header: "Contact",
      cell: (c) => (
        <>
          <Link
            href={PATHS.khataContact(c.id)}
            className="font-medium hover:underline"
          >
            {c.name}
          </Link>
          <span className="block text-xs text-muted-foreground">
            {c.entryCount} entr{c.entryCount === 1 ? "y" : "ies"}
            {c.phone ? ` · ${c.phone}` : ""}
          </span>
        </>
      ),
    },
    {
      header: "You gave",
      align: "right",
      cell: (c) => formatCurrency(c.gave),
      className: "tabular-nums text-expense",
    },
    {
      header: "You got",
      align: "right",
      cell: (c) => formatCurrency(c.got),
      className: "tabular-nums text-profit",
    },
    {
      header: "Balance",
      align: "right",
      cell: (c) => (
        <>
          <span
            className={cn("font-semibold tabular-nums", balanceTone(c.balance))}
          >
            {formatCurrency(Math.abs(c.balance))}
          </span>
          <span className="block text-xs text-muted-foreground">
            {balanceLabel(c.balance)}
          </span>
        </>
      ),
    },
  ];

  return (
    <EntityList
      title="Khata"
      description="Side money flow — lending and borrowing, kept separate from route profit."
      icon={BookUser}
      items={contacts}
      totalCount={book.length}
      keyOf={(c) => c.id}
      query={query}
      searchPlaceholder="Search contacts by name or phone"
      createLabel="Add contact"
      onCreate={() => setAddOpen(true)}
      tiles={[
        { label: "You'll get", value: formatCurrency(willGet), tone: "profit" },
        {
          label: "You'll give",
          value: formatCurrency(willGive),
          tone: "expense",
        },
      ]}
      columns={columns}
      detailHref={(c) => PATHS.khataContact(c.id)}
      rowActions={(c) => (
        <RowActions
          name={c.name}
          onEdit={() => setEditing(c)}
          onDelete={() => setConfirming(c)}
          pending={isDeleting && confirming?.id === c.id}
        />
      )}
      renderCard={(c) => (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={PATHS.khataContact(c.id)}
                className="font-medium hover:underline"
              >
                {c.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {c.entryCount} entr{c.entryCount === 1 ? "y" : "ies"}
                {c.phone ? ` · ${c.phone}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  balanceTone(c.balance),
                )}
              >
                {formatCurrency(Math.abs(c.balance))}
              </p>
              <p className="text-xs text-muted-foreground">
                {balanceLabel(c.balance)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Gave{" "}
              <span className="text-expense">{formatCurrency(c.gave)}</span> ·
              Got <span className="text-profit">{formatCurrency(c.got)}</span>
            </p>
            <div className="flex shrink-0">
              <RowActions
                name={c.name}
                onEdit={() => setEditing(c)}
                onDelete={() => setConfirming(c)}
                pending={isDeleting && confirming?.id === c.id}
              />
            </div>
          </div>
        </>
      )}
    >
      <KhataContactDialog open={addOpen} onOpenChange={setAddOpen} />
      <KhataContactDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        contact={editing}
      />

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Delete ${confirming?.name ?? "contact"}?`}
        description={
          confirming ? (
            <>
              This permanently deletes {confirming.name} and all{" "}
              {confirming.entryCount} khata entr
              {confirming.entryCount === 1 ? "y" : "ies"}. A running balance of{" "}
              {formatCurrency(Math.abs(confirming.balance))} (
              {balanceLabel(confirming.balance)}) will no longer be tracked.
              This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete contact"
        onConfirm={handleDelete}
        pending={isDeleting}
      />
    </EntityList>
  );
}
