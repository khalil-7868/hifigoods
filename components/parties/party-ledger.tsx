"use client";

import Link from "next/link";
import { useState } from "react";

import { ArrowLeft, Loader2, Plus, Printer, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDialog } from "@/components/parties/payment-dialog";
import { TallyCalculator } from "@/components/parties/tally-calculator";
import { deletePayment, restorePayment } from "@/app/(app)/ledgers/parties/actions";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PartyDetail } from "@/lib/parties-data";
import { PATHS } from "@/lib/routes";

function Metric({ label, value, tone }: { label: string; value: string; tone?: "profit" | "expense" }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums sm:text-2xl", tone === "profit" && "text-profit", tone === "expense" && "text-expense")}>{value}</p>
    </div>
  );
}

export function PartyLedger({ detail }: { detail: PartyDetail }) {
  const { party, entries } = detail;
  const [payOpen, setPayOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { remove, isPending: isDeleting } = useUndoableDelete({
    onDelete: (id: string) => deletePayment(id, party.id),
    onRestore: (row) => restorePayment(row, party.id),
    deletedMessage: (row) => (row ? `Payment of ${formatCurrency(Number(row.amount))} removed.` : "Payment removed."),
    restoredMessage: "Payment restored.",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={PATHS.parties}>
            <ArrowLeft aria-hidden />
            Back to parties
          </Link>
        </Button>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{party.name}</h1>
            <p className="text-sm text-muted-foreground">{[party.city, party.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden />
              Print
            </Button>
            <Button onClick={() => setPayOpen(true)}>
              <Plus aria-hidden />
              Record payment
            </Button>
          </div>
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
          <h1 className="mt-3 text-xl font-semibold">Statement — {party.name}</h1>
        </div>

        <section aria-label="Party balance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Opening" value={formatCurrency(Number(party.opening_balance))} />
          <Metric label="Billed" value={formatCurrency(party.billed)} />
          <Metric label="Received" value={formatCurrency(party.received)} tone="profit" />
          <Metric label="Outstanding" value={formatCurrency(party.balance)} tone={party.balance > 0 ? "expense" : "profit"} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Statement</CardTitle>
            <CardDescription>Every bill and payment in date order, with a running balance.</CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet. Assign a route to this party, or record a payment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right no-print" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={`${e.kind}-${e.id}`} className="print-keep-together">
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(e.date)}</TableCell>
                      <TableCell>
                        {e.routeId ? (
                          <Link href={PATHS.route(e.routeId)} className="font-medium hover:underline">
                            {e.description}
                          </Link>
                        ) : (
                          <span className="font-medium">{e.description}</span>
                        )}
                        {e.notes && <span className="block text-xs text-muted-foreground">{e.notes}</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{e.debit ? formatCurrency(e.debit) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-profit">{e.credit ? formatCurrency(e.credit) : "—"}</TableCell>
                      <TableCell className={cn("text-right font-medium tabular-nums", e.balance > 0 ? "text-expense" : "text-profit")}>{formatCurrency(e.balance)}</TableCell>
                      <TableCell className="text-right no-print">
                        {e.kind === "payment" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-expense"
                            aria-label="Delete payment"
                            onClick={() => {
                              setDeletingId(e.id);
                              remove(e.id);
                            }}
                            disabled={isDeleting && deletingId === e.id}>
                            {isDeleting && deletingId === e.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Quick tally
            <Badge variant="secondary" className="font-normal">
              Scratch pad
            </Badge>
          </CardTitle>
          <CardDescription>Add up cash or invoices without leaving the page.</CardDescription>
        </CardHeader>
        <CardContent>
          <TallyCalculator className="max-w-sm" />
        </CardContent>
      </Card>

      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} partyId={party.id} outstanding={party.balance} />
    </div>
  );
}
