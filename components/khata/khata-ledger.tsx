"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Printer,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KhataEntryDialog } from "@/components/khata/khata-entry-dialog";
import {
  deleteKhataEntry,
  restoreKhataEntry,
} from "@/app/(app)/ledgers/khata/actions";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { balanceLabel } from "@/lib/khata";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KhataDirection } from "@/lib/database.types";
import type { KhataContactDetail } from "@/lib/khata-data";
import { PATHS } from "@/lib/routes";

export function KhataLedger({ detail }: { detail: KhataContactDetail }) {
  const { contact, entries } = detail;
  const [entryOpen, setEntryOpen] = useState(false);
  const [direction, setDirection] = useState<KhataDirection>("gave");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { remove, isPending: isDeleting } = useUndoableDelete({
    onDelete: (id: string) => deleteKhataEntry(id, contact.id),
    onRestore: (row) => restoreKhataEntry(row, contact.id),
    deletedMessage: (row) =>
      row
        ? `${row.direction === "gave" ? "Given" : "Got"} ${formatCurrency(Number(row.amount))} deleted.`
        : "Entry deleted.",
    restoredMessage: "Entry restored.",
  });

  function openEntry(d: KhataDirection) {
    setDirection(d);
    setEntryOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={PATHS.khata}>
            <ArrowLeft aria-hidden />
            Back to khata
          </Link>
        </Button>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {contact.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {contact.phone ?? "No phone"} · {contact.entryCount} entr
              {contact.entryCount === 1 ? "y" : "ies"}
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print
          </Button>
        </header>
      </div>

      <div data-print-area className="space-y-6">
        <div className="hidden print:block">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="size-5" aria-hidden />
              HiFiGoods
            </div>
            <span className="text-sm">{formatDate(new Date())}</span>
          </div>
          <h1 className="mt-3 text-xl font-semibold">Khata — {contact.name}</h1>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {balanceLabel(contact.balance)}
              </p>
              <p
                className={cn(
                  "text-3xl font-semibold tabular-nums",
                  contact.balance > 0
                    ? "text-profit"
                    : contact.balance < 0
                      ? "text-expense"
                      : "",
                )}
              >
                {formatCurrency(Math.abs(contact.balance))}
              </p>
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="destructive" onClick={() => openEntry("gave")}>
                <ArrowUpRight aria-hidden />
                You gave
              </Button>
              <Button variant="profit" onClick={() => openEntry("got")}>
                <ArrowDownLeft aria-hidden />
                You got
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
            <CardDescription>
              Oldest first, with a running balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No entries yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">You gave</TableHead>
                    <TableHead className="text-right">You got</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="no-print" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id} className="print-keep-together">
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(e.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-expense">
                        {e.direction === "gave"
                          ? formatCurrency(Number(e.amount))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-profit">
                        {e.direction === "got"
                          ? formatCurrency(Number(e.amount))
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          e.balance > 0 ? "text-profit" : e.balance < 0 ? "text-expense" : "",
                        )}
                      >
                        {formatCurrency(Math.abs(e.balance))}
                      </TableCell>
                      <TableCell className="text-right no-print">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-expense"
                          aria-label="Delete entry"
                          onClick={() => {
                            setDeletingId(e.id);
                            remove(e.id);
                          }}
                          disabled={isDeleting && deletingId === e.id}
                        >
                          {isDeleting && deletingId === e.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <KhataEntryDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        contactId={contact.id}
        initialDirection={direction}
      />

    </div>
  );
}
