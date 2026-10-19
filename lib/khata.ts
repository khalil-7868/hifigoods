/**
 * Client-SAFE khatabook types/helpers. No server imports — the DB fetch lives
 * in lib/khata-data.ts.
 *
 * Convention: 'gave' = money you handed out, so they owe you (balance up).
 *             'got'  = money you received back (balance down).
 * A positive balance means the contact owes you.
 */
import type { KhataContact, KhataEntry } from "@/lib/database.types";

export interface KhataContactVM extends KhataContact {
  gave: number;
  got: number;
  /** opening_balance + gave - got */
  balance: number;
  entryCount: number;
}

export interface KhataLedgerEntry extends KhataEntry {
  /** Running balance after this entry. */
  balance: number;
}

export function balanceLabel(balance: number): string {
  if (Math.abs(balance) < 0.005) return "Settled";
  return balance > 0 ? "You'll get" : "You'll give";
}

/** Walk entries oldest-first, producing a running balance. */
export function buildKhataLedger(
  openingBalance: number,
  entries: KhataEntry[],
): KhataLedgerEntry[] {
  let running = Number(openingBalance);
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .map((e) => {
      running += e.direction === "gave" ? Number(e.amount) : -Number(e.amount);
      return { ...e, balance: running };
    });
}
