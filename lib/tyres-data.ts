import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import {
  DEFAULT_LIFE_KM,
  type TyresPage,
  type TyreVM,
} from "@/lib/tyres";

// Constants and the view-model type live in the client-safe module and are
// re-exported here so existing server-side imports keep working.
export * from "@/lib/tyres";
import type { Tyre, Vehicle } from "@/lib/database.types";

/**
 * A tyre's km life, or null when it genuinely can't be determined.
 *
 * `odometer_removed` is authoritative once set. Otherwise we measure against
 * the vehicle's current odometer — but an odometer of 0 means "never
 * recorded", not "the truck hasn't moved". Returning 0 there would present a
 * missing reading as a real measurement and quietly poison cost-per-km, so we
 * return null and let the UI ask for the reading instead.
 *
 * Negative results clamp to 0: a vehicle odometer can legitimately sit below
 * odometer_fitted if the tyre was moved over from another truck.
 */
function computeKmRun(tyre: Tyre, vehicleOdometer: number): number | null {
  if (tyre.odometer_removed !== null) {
    return Math.max(
      0,
      Number(tyre.odometer_removed) - Number(tyre.odometer_fitted),
    );
  }
  if (!vehicleOdometer) return null;
  return Math.max(0, vehicleOdometer - Number(tyre.odometer_fitted));
}

function toVM(tyre: Tyre, vehicle: Vehicle | undefined): TyreVM {
  const kmRun = computeKmRun(tyre, Number(vehicle?.odometer ?? 0));
  const isActive = tyre.status === "in_use" || tyre.status === "spare";
  const cost = Number(tyre.purchase_cost);

  return {
    ...tyre,
    vehiclePlate: vehicle?.plate_number ?? null,
    kmRun,
    costPerKm: kmRun !== null && kmRun > 0 ? cost / kmRun : null,
    needsAttention:
      tyre.status === "in_use" && kmRun !== null && kmRun >= DEFAULT_LIFE_KM,
    isActive,
  };
}

/** Every tyre with km life and cost-per-km, plus the vehicles to group by. */
export async function getTyres(): Promise<TyresPage> {
  const supabase = await createClient();

  const [tyresRes, vehiclesRes] = await Promise.all([
    supabase
      .from("tyres")
      .select("*")
      .order("status")
      .order("purchase_date", { ascending: false }),
    supabase.from("vehicles").select("*").order("plate_number"),
  ]);

  if (tyresRes.error) throwDbError(tyresRes.error.message);
  if (vehiclesRes.error) throwDbError(vehiclesRes.error.message);

  const vehicles = vehiclesRes.data ?? [];
  const byId = new Map(vehicles.map((v) => [v.id, v]));

  const tyres = (tyresRes.data ?? []).map((t) => toVM(t, byId.get(t.vehicle_id)));

  // Vehicles that hold tyres but have never had an odometer recorded — every
  // km figure for those tyres is unknowable until someone enters one.
  const withTyres = new Set(tyres.map((t) => t.vehicle_id));
  const missingOdometer = vehicles.filter(
    (v) => withTyres.has(v.id) && !Number(v.odometer),
  ).length;

  return {
    tyres,
    vehicles,
    totals: {
      count: tyres.length,
      active: tyres.filter((t) => t.isActive).length,
      needsAttention: tyres.filter((t) => t.needsAttention).length,
      invested: tyres.reduce((s, t) => s + Number(t.purchase_cost), 0),
      missingOdometer,
    },
  };
}
