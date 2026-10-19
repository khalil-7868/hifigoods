import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import { getRouteRows, type SharedRouteRow } from "@/lib/route-rows";
import type { Party, PartyPayment } from "@/lib/database.types";

export interface PartyVM extends Party {
  /** Total freight billed to this party (rolled up for multi-leg routes). */
  billed: number;
  /** Total cash received. */
  received: number;
  /** opening_balance + billed - received. Positive = they owe you. */
  balance: number;
  routeCount: number;
}

/** One line of a party statement — a bill (debit) or a payment (credit). */
export interface LedgerEntry {
  id: string;
  date: string;
  kind: "bill" | "payment";
  description: string;
  debit: number;
  credit: number;
  /** Running balance after this entry. */
  balance: number;
  routeId?: string;
  method?: string;
  notes?: string | null;
}


/**
 * Billed amount per route id. A main route's freight is the sum of its legs,
 * so we roll legs up into their parent and skip them as standalone bills.
 */
function billedByRoute(rows: SharedRouteRow[]): Map<string, number> {
  const legTotals = new Map<string, number>();
  for (const r of rows) {
    if (r.parent_route_id) {
      legTotals.set(
        r.parent_route_id,
        (legTotals.get(r.parent_route_id) ?? 0) + Number(r.revenue),
      );
    }
  }

  const billed = new Map<string, number>();
  for (const r of rows) {
    if (r.parent_route_id) continue; // legs bill through their parent
    const legs = legTotals.get(r.id);
    billed.set(r.id, legs !== undefined ? legs : Number(r.revenue));
  }
  return billed;
}


/** All parties with their billed / received / outstanding balance. */
export async function getParties(): Promise<PartyVM[]> {
  const supabase = await createClient();

  const [partiesRes, paymentsRes, routes] = await Promise.all([
    supabase.from("parties").select("*").order("name"),
    supabase.from("party_payments").select("party_id, amount"),
    getRouteRows(),
  ]);

  if (partiesRes.error) throw new Error(partiesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  const billed = billedByRoute(routes);

  const billedByParty = new Map<string, { amount: number; count: number }>();
  for (const r of routes) {
    if (r.parent_route_id || !r.party_id) continue;
    const entry = billedByParty.get(r.party_id) ?? { amount: 0, count: 0 };
    entry.amount += billed.get(r.id) ?? 0;
    entry.count += 1;
    billedByParty.set(r.party_id, entry);
  }

  const receivedByParty = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    receivedByParty.set(
      p.party_id,
      (receivedByParty.get(p.party_id) ?? 0) + Number(p.amount),
    );
  }

  return (partiesRes.data ?? []).map((party) => {
    const b = billedByParty.get(party.id) ?? { amount: 0, count: 0 };
    const received = receivedByParty.get(party.id) ?? 0;
    return {
      ...party,
      billed: b.amount,
      received,
      balance: Number(party.opening_balance) + b.amount - received,
      routeCount: b.count,
    };
  });
}

export interface PartyDetail {
  party: PartyVM;
  entries: LedgerEntry[];
  payments: PartyPayment[];
}

/** One party with a full chronological statement and running balance. */
export async function getPartyDetail(id: string): Promise<PartyDetail | null> {
  const supabase = await createClient();

  const [partyRes, paymentsRes, routes] = await Promise.all([
    supabase.from("parties").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("party_payments")
      .select("*")
      .eq("party_id", id)
      .order("date", { ascending: true }),
    getRouteRows(),
  ]);

  if (partyRes.error) throw new Error(partyRes.error.message);
  if (!partyRes.data) return null;
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  const party = partyRes.data;
  const payments = paymentsRes.data ?? [];
  const billed = billedByRoute(routes);

  const bills: LedgerEntry[] = routes
    .filter((r) => !r.parent_route_id && r.party_id === id)
    .map((r) => ({
      id: r.id,
      date: r.start_date,
      kind: "bill" as const,
      description: `${r.origin} → ${r.destination}`,
      debit: billed.get(r.id) ?? 0,
      credit: 0,
      balance: 0,
      routeId: r.id,
    }));

  const credits: LedgerEntry[] = payments.map((p) => ({
    id: p.id,
    date: p.date,
    kind: "payment" as const,
    description: `Payment received (${p.method})`,
    debit: 0,
    credit: Number(p.amount),
    balance: 0,
    method: p.method,
    notes: p.notes,
  }));

  const entries = [...bills, ...credits].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.kind === "bill" ? -1 : 1),
  );

  let running = Number(party.opening_balance);
  for (const e of entries) {
    running += e.debit - e.credit;
    e.balance = running;
  }

  const totalBilled = bills.reduce((s, e) => s + e.debit, 0);
  const totalReceived = credits.reduce((s, e) => s + e.credit, 0);

  return {
    party: {
      ...party,
      billed: totalBilled,
      received: totalReceived,
      balance: Number(party.opening_balance) + totalBilled - totalReceived,
      routeCount: bills.length,
    },
    entries,
    payments,
  };
}

/** Lightweight list for route form dropdowns. */
export const getPartyOptions = cache(async (): Promise<Party[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .order("name");
  if (error) throwDbError(error.message);
  return data ?? [];
})
