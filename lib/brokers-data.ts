import { cache } from "react";
/**
 * SERVER-ONLY. Imports supabase/server (next/headers).
 * Client-safe helpers/types live in lib/brokers.ts.
 */
import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import { getRouteRows, type SharedRouteRow } from "@/lib/route-rows";
import {
  allocatePayments,
  commissionFor,
  type BrokerLeg,
  type BrokerVM,
} from "@/lib/brokers";
import { asBrokerCommissionType } from "@/lib/database.types";
import type { Broker, BrokerPayment } from "@/lib/database.types";

/**
 * Rows come from the shared request-memoized routes read (lib/route-rows.ts),
 * so `broker_commission_type` arrives as the raw `text` column. It's narrowed
 * with asBrokerCommissionType() where the value is actually used, rather than
 * asserted here — an unexpected legacy value then degrades to "no commission"
 * instead of silently mis-typing.
 */
type RouteRow = SharedRouteRow;

/** Legs (or standalone routes) that carry a broker, grouped by broker id. */
function legsByBroker(rows: RouteRow[]) {
  const map = new Map<string, Omit<BrokerLeg, "received" | "outstanding" | "status">[]>();

  for (const r of rows) {
    if (!r.broker_id) continue;
    const rent = Number(r.revenue);
    const commission = commissionFor(
      rent,
      asBrokerCommissionType(r.broker_commission_type),
      r.broker_commission_value,
    );
    const list = map.get(r.broker_id) ?? [];
    list.push({
      id: r.id,
      // Legs link to their parent route page; a main route links to itself.
      routeId: r.parent_route_id ?? r.id,
      origin: r.origin,
      destination: r.destination,
      date: r.start_date,
      rent,
      commission,
      net: rent - commission,
    });
    map.set(r.broker_id, list);
  }
  return map;
}

export async function getBrokers(): Promise<BrokerVM[]> {
  const supabase = await createClient();

  const [brokersRes, routesRes, paymentsRes] = await Promise.all([
    supabase.from("brokers").select("*").order("name"),
    getRouteRows(),
    supabase.from("broker_payments").select("broker_id, amount"),
  ]);

  if (brokersRes.error) throwDbError(brokersRes.error.message);
  if (paymentsRes.error) throwDbError(paymentsRes.error.message);

  const byBroker = legsByBroker(routesRes);

  const receivedBy = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    receivedBy.set(
      p.broker_id,
      (receivedBy.get(p.broker_id) ?? 0) + Number(p.amount),
    );
  }

  return (brokersRes.data ?? []).map((broker: Broker) => {
    const legs = byBroker.get(broker.id) ?? [];
    const received = receivedBy.get(broker.id) ?? 0;
    const allocated = allocatePayments(legs, received);

    const rent = legs.reduce((s, l) => s + l.rent, 0);
    const commission = legs.reduce((s, l) => s + l.commission, 0);
    const owed = rent - commission;

    return {
      ...broker,
      rent,
      commission,
      owed,
      received,
      balance: owed - received,
      legCount: legs.length,
      unpaidCount: allocated.filter((l) => l.status !== "paid").length,
    };
  });
}

export interface BrokerDetail {
  broker: BrokerVM;
  legs: BrokerLeg[];
  payments: BrokerPayment[];
}

export async function getBrokerDetail(id: string): Promise<BrokerDetail | null> {
  const supabase = await createClient();

  const [brokerRes, routesRes, paymentsRes] = await Promise.all([
    supabase.from("brokers").select("*").eq("id", id).maybeSingle(),
    getRouteRows(),
    supabase
      .from("broker_payments")
      .select("*")
      .eq("broker_id", id)
      .order("date", { ascending: true }),
  ]);

  if (brokerRes.error) throwDbError(brokerRes.error.message);
  if (!brokerRes.data) return null;
  if (paymentsRes.error) throwDbError(paymentsRes.error.message);

  const payments = paymentsRes.data ?? [];
  const received = payments.reduce((s, p) => s + Number(p.amount), 0);

  const legs = allocatePayments(
    legsByBroker(routesRes).get(id) ?? [],
    received,
  );

  const rent = legs.reduce((s, l) => s + l.rent, 0);
  const commission = legs.reduce((s, l) => s + l.commission, 0);
  const owed = rent - commission;

  return {
    broker: {
      ...brokerRes.data,
      rent,
      commission,
      owed,
      received,
      balance: owed - received,
      legCount: legs.length,
      unpaidCount: legs.filter((l) => l.status !== "paid").length,
    },
    legs,
    payments,
  };
}

/** Lightweight list for route form dropdowns. */
export const getBrokerOptions = cache(async (): Promise<Broker[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brokers")
    .select("*")
    .order("name");
  if (error) throwDbError(error.message);
  return data ?? [];
})
