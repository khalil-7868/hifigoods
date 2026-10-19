import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Handshake,
  PauseCircle,
  Truck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PartyVM } from "@/lib/parties-data";
import type { BrokerVM } from "@/lib/brokers";
import type { RouteWithExpenses } from "@/lib/analytics";
import type { Vehicle } from "@/lib/database.types";
import { PATHS } from "@/lib/routes";

/**
 * "Needs attention" — the things an operator opens the app to find out.
 *
 * The stat cards below this answer "how did we do"; this answers "what do I
 * have to chase today". Everything here is actionable and links straight to
 * the record, and the whole section disappears when nothing needs doing
 * rather than sitting there as four empty boxes.
 */

const MAX_ROWS = 4;

function Row({
  href,
  primary,
  secondary,
  value,
  tone,
}: {
  href: string;
  primary: string;
  secondary: string;
  value: string;
  tone: "expense" | "warning" | "muted";
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{primary}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {secondary}
          </span>
        </span>
        <span
          className={
            "shrink-0 text-sm font-semibold tabular-nums " +
            (tone === "expense"
              ? "text-expense"
              : tone === "warning"
                ? "text-warning"
                : "text-muted-foreground")
          }
        >
          {value}
        </span>
      </Link>
    </li>
  );
}

function Panel({
  title,
  icon: Icon,
  count,
  href,
  children,
}: {
  title: string;
  icon: typeof Users;
  count: number;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
        <Badge variant="outline" className="tabular-nums">
          {count}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1 pb-3">
        <ul className="space-y-0.5">{children}</ul>
        {count > MAX_ROWS && (
          <Link
            href={href}
            className="mt-2 inline-flex items-center gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View all {count}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function AttentionStrip({
  parties,
  brokers,
  vehicles,
  routes,
}: {
  parties: PartyVM[];
  brokers: BrokerVM[];
  vehicles: Vehicle[];
  routes: RouteWithExpenses[];
}) {
  const owing = parties
    .filter((p) => p.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const unsettled = brokers
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const idle = vehicles.filter((v) => v.status === "idle");

  // A main route with no end_date is still on the road.
  const running = routes
    .filter((r) => !r.parent_route_id && !r.end_date)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  const nothingToDo =
    owing.length === 0 &&
    unsettled.length === 0 &&
    idle.length === 0 &&
    running.length === 0;

  if (nothingToDo) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-profit" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Nothing needs chasing — no outstanding balances, no idle vehicles,
            no trips still open.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-label="Needs attention" className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <AlertCircle className="size-4" aria-hidden />
        Needs attention
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {owing.length > 0 && (
          <Panel
            title="Parties owe you"
            icon={Users}
            count={owing.length}
            href={PATHS.parties}
          >
            {owing.slice(0, MAX_ROWS).map((p) => (
              <Row
                key={p.id}
                href={PATHS.party(p.id)}
                primary={p.name}
                secondary={`${p.routeCount} route${p.routeCount === 1 ? "" : "s"}${p.city ? ` · ${p.city}` : ""}`}
                value={formatCurrency(p.balance)}
                tone="expense"
              />
            ))}
          </Panel>
        )}

        {unsettled.length > 0 && (
          <Panel
            title="Brokers to settle"
            icon={Handshake}
            count={unsettled.length}
            href={PATHS.brokers}
          >
            {unsettled.slice(0, MAX_ROWS).map((b) => (
              <Row
                key={b.id}
                href={PATHS.broker(b.id)}
                primary={b.name}
                secondary={
                  b.unpaidCount > 0
                    ? `${b.unpaidCount} unpaid leg${b.unpaidCount === 1 ? "" : "s"}`
                    : `${b.legCount} leg${b.legCount === 1 ? "" : "s"}`
                }
                value={formatCurrency(b.balance)}
                tone="expense"
              />
            ))}
          </Panel>
        )}

        {running.length > 0 && (
          <Panel
            title="Trips still open"
            icon={Truck}
            count={running.length}
            href={PATHS.routes}
          >
            {running.slice(0, MAX_ROWS).map((r) => (
              <Row
                key={r.id}
                href={PATHS.route(r.id)}
                primary={`${r.origin} → ${r.destination}`}
                secondary={`Started ${formatDate(r.start_date)}`}
                value="open"
                tone="warning"
              />
            ))}
          </Panel>
        )}

        {idle.length > 0 && (
          <Panel
            title="Idle vehicles"
            icon={PauseCircle}
            count={idle.length}
            href={PATHS.vehicles}
          >
            {idle.slice(0, MAX_ROWS).map((v) => (
              <Row
                key={v.id}
                href={PATHS.vehicles}
                primary={v.plate_number}
                secondary={v.make_model ?? "No model set"}
                value="idle"
                tone="muted"
              />
            ))}
          </Panel>
        )}
      </div>
    </section>
  );
}
