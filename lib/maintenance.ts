/**
 * Client-SAFE maintenance helpers and types.
 *
 * Keep this file free of any server-only import (supabase/server, next/headers,
 * next/cache). Client Components import from here; the database fetch lives in
 * lib/maintenance-data.ts, which is server-only.
 */
import type { MaintenanceFee } from "@/lib/database.types";

export interface MaintenanceVM extends MaintenanceFee {
  vehicle: { plate_number: string; make_model: string | null } | null;
  mechanic: { name: string; workshop: string | null } | null;
}

/** First day of the month for a given date, as an ISO date string. */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Human label for a month key, e.g. "Jul 2026". */
export function monthLabel(key: string): string {
  const d = new Date(key);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Total maintenance booked inside a date range (inclusive). A month counts
 * when its first day falls in the range, matching how reports scope routes.
 */
export function sumMaintenanceInRange(
  fees: MaintenanceVM[],
  range: { start: Date; end: Date } | null,
  vehicleId: string = "all",
): number {
  return fees
    .filter((f) => vehicleId === "all" || f.vehicle_id === vehicleId)
    .filter((f) => {
      if (!range) return true;
      const d = new Date(f.month);
      return d >= range.start && d <= range.end;
    })
    .reduce((s, f) => s + Number(f.amount), 0);
}
