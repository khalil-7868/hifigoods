"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Plus, Printer, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TableFooterRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BrokerPaymentDialog } from "@/components/brokers/broker-payment-dialog";
import {
  deleteBrokerPayment,
  restoreBrokerPayment,
} from "@/app/(app)/ledgers/brokers/actions";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import { RENT_STATUS_LABEL, type RentStatus } from "@/lib/brokers";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BrokerDetail } from "@/lib/brokers-data";
import { PATHS } from "@/lib/routes";

const statusVariant: Record<RentStatus, "profit" | "warning" | "expense"> = {
  paid: "profit",
  part: "warning",
  unpaid: "expense",
};

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "expense";
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums sm:text-2xl",
          tone === "profit" && "text-profit",
          tone === "expense" && "text-expense",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function BrokerLedger({ detail }: { detail: BrokerDetail }) {
  const { broker, legs, payments } = detail;
  const [payOpen, setPayOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { remove, isPending: isDeleting } = useUndoableDelete({
    onDelete: (id: string) => deleteBrokerPayment(id, broker.id),
    onRestore: (row) => restoreBrokerPayment(row, broker.id),
    deletedMessage: (row) =>
      row
        ? `Settlement of ${formatCurrency(Number(row.amount))} removed.`
        : "Settlement removed.",
    restoredMessage: "Settlement restored.",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={PATHS.brokers}>
            <ArrowLeft aria-hidden />
            Back to brokers
          </Link>
        </Button>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {broker.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[broker.city, broker.phone].filter(Boolean).join(" · ") ||
                "No contact details"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden />
              Print
            </Button>
            <Button onClick={() => setPayOpen(true)}>
              <Plus aria-hidden />
              Record rent
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
          <h1 className="mt-3 text-xl font-semibold">
            Broker statement — {broker.name}
          </h1>
        </div>

        <section
          aria-label="Broker balance"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <Metric label="Total rent" value={formatCurrency(broker.rent)} />
          <Metric
            label="Commission"
            value={formatCurrency(broker.commission)}
          />
          <Metric
            label="Received"
            value={formatCurrency(broker.received)}
            tone="profit"
          />
          <Metric
            label="Outstanding"
            value={formatCurrency(broker.balance)}
            tone={broker.balance > 0 ? "expense" : "profit"}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Route rent</CardTitle>
            <CardDescription>
              Each leg this broker arranged. Payments settle the oldest legs
              first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {legs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No legs assigned to this broker yet. Pick them on a route or leg
                to start tracking rent.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leg</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Rent</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legs.map((leg) => (
                    <TableRow key={leg.id} className="print-keep-together">
                      <TableCell>
                        <Link
                          href={PATHS.route(leg.routeId)}
                          className="flex flex-wrap items-center gap-1 font-medium hover:underline"
                        >
                          {leg.origin}
                          <ArrowRight
                            className="size-3 text-muted-foreground"
                            aria-hidden
                          />
                          {leg.destination}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(leg.date)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(leg.rent)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {leg.commission ? formatCurrency(leg.commission) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-profit">
                        {formatCurrency(leg.received)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(leg.outstanding)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[leg.status]}>
                          {RENT_STATUS_LABEL[leg.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableFooterRow>
                    <TableCell colSpan={2} className="text-right text-muted-foreground">
                      Total
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(broker.rent)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(broker.commission)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-profit">
                      {formatCurrency(broker.received)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-expense">
                      {formatCurrency(broker.balance)}
                    </TableCell>
                    <TableCell />
                  </TableFooterRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payments received</CardTitle>
              <CardDescription>Rent handed over by this broker.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="no-print" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(p.date)}
                      </TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-profit">
                        {formatCurrency(Number(p.amount))}
                      </TableCell>
                      <TableCell className="text-right no-print">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-expense"
                          aria-label="Delete payment"
                          onClick={() => {
                            setDeletingId(p.id);
                            remove(p.id);
                          }}
                          disabled={isDeleting && deletingId === p.id}
                        >
                          {isDeleting && deletingId === p.id ? (
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
            </CardContent>
          </Card>
        )}
      </div>

      <BrokerPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        brokerId={broker.id}
        outstanding={broker.balance}
      />

    </div>
  );
}
