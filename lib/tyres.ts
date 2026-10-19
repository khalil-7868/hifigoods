import type { Tyre, TyreStatus, Vehicle } from "@/lib/database.types";

/**
 * Client-safe tyre constants and pure helpers.
 *
 * Deliberately imports nothing but types. `lib/tyres-data.ts` imports the
 * Supabase server client, which imports `next/headers` — pulling any value from
 * it into a `"use client"` component fails the production build with
 * "You're importing a component that needs next/headers".
 *
 * This mirrors the split the rest of the app already uses: `lib/khata.ts` /
 * `lib/khata-data.ts`, `lib/brokers.ts` / `lib/brokers-data.ts`,
 * `lib/maintenance.ts` / `lib/maintenance-data.ts`. Tyres was the odd one out.
 */

/** Warn when a fitted tyre passes this many km. */
export const DEFAULT_LIFE_KM = 60_000;

export const TYRE_STATUSES: readonly TyreStatus[] = [
  "in_use",
  "spare",
  "retreaded",
  "scrapped",
] as const;

export const TYRE_STATUS_LABEL: Record<TyreStatus, string> = {
  in_use: "In use",
  spare: "Spare",
  retreaded: "Retreaded",
  scrapped: "Scrapped",
};

/** Common truck tyre sizes in Pakistan, offered as combobox suggestions. */
export const TYRE_SIZES: readonly string[] = [
  "1000-20",
  "1100-20",
  "1200-20",
  "295/80R22.5",
  "315/80R22.5",
  "825-16",
  "750-16",
] as const;

/** Axle positions. Free text is still allowed for odd configurations. */
export const TYRE_POSITIONS: readonly string[] = [
  "Front left",
  "Front right",
  "Rear left outer",
  "Rear left inner",
  "Rear right outer",
  "Rear right inner",
  "Trailer left",
  "Trailer right",
  "Spare",
] as const;

export interface TyreVM extends Tyre {
  vehiclePlate: string | null;
  /**
   * Kilometres this tyre has run, or **null when it can't be known** — which is
   * the case for a fitted tyre on a vehicle with no odometer recorded. Null and
   * zero mean very different things here and the UI must not conflate them:
   * "0 km" reads as a measurement, "—" reads as missing data.
   */
  kmRun: number | null;
  /** purchase_cost / kmRun, or null when km life is unknown or zero. */
  costPerKm: number | null;
  /** True when a fitted tyre is past DEFAULT_LIFE_KM and needs checking. */
  needsAttention: boolean;
  /** Present tense only for in_use / spare. */
  isActive: boolean;
}

/** Page-level shape returned by getTyres(). Plain data, so it lives here
 * rather than in the server module the client can't import. */
export interface TyresPage {
  tyres: TyreVM[];
  vehicles: Vehicle[];
  /** Rollups across every tyre, not just the filtered view. */
  totals: {
    count: number;
    active: number;
    needsAttention: number;
    invested: number;
    /** Vehicles holding tyres but with no odometer recorded. */
    missingOdometer: number;
  };
}
