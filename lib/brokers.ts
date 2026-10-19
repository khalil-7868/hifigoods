/**
 * Client-SAFE broker helpers and types. No server imports here — the DB fetch
 * lives in lib/brokers-data.ts.
 */
import type { Broker, BrokerCommissionType } from "@/lib/database.types";

export type RentStatus = "paid" | "part" | "unpaid";

/** One leg (or route) whose rent a broker owes you. */
export interface BrokerLeg {
  id: string;
  /** Where to link — the main route this leg belongs to. */
  routeId: string;
  origin: string;
  destination: string;
  date: string;
  rent: number;
  commission: number;
  /** rent - commission: what the broker should hand over. */
  net: number;
  /** Allocated from payments, oldest leg first. */
  received: number;
  outstanding: number;
  status: RentStatus;
}

export interface BrokerVM extends Broker {
  rent: number;
  commission: number;
  /** rent - commission */
  owed: number;
  received: number;
  /** owed - received. Positive = broker still owes you. */
  balance: number;
  legCount: number;
  unpaidCount: number;
}

/** Commission for one leg, from its type and value. */
export function commissionFor(
  rent: number,
  type: BrokerCommissionType | null,
  value: number | null,
): number {
  const v = Number(value ?? 0);
  if (!type || v <= 0) return 0;
  return type === "percent" ? (rent * v) / 100 : v;
}

/**
 * Spread a broker's payments across their legs, oldest first, so each leg
 * reads as paid / part-paid / unpaid. Brokers settle in lump sums rather than
 * per leg, so this is how we derive per-leg status.
 */
export function allocatePayments(
  legs: Omit<BrokerLeg, "received" | "outstanding" | "status">[],
  totalReceived: number,
): BrokerLeg[] {
  let pool = totalReceived;

  return [...legs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((leg) => {
      const received = Math.min(pool, leg.net);
      pool -= received;
      const outstanding = leg.net - received;
      const status: RentStatus =
        outstanding <= 0.005 ? "paid" : received > 0 ? "part" : "unpaid";
      return { ...leg, received, outstanding, status };
    });
}

export const RENT_STATUS_LABEL: Record<RentStatus, string> = {
  paid: "Paid",
  part: "Part-paid",
  unpaid: "Pending",
};
