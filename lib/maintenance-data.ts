import { cache } from "react";
/**
 * SERVER-ONLY. Imports supabase/server (next/headers).
 * Client-safe helpers and types live in lib/maintenance.ts.
 */
import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import type { MaintenanceFee, Mechanic } from "@/lib/database.types";
import type { MaintenanceVM } from "@/lib/maintenance";

type RawFee = MaintenanceFee & {
  vehicles: { plate_number: string; make_model: string | null } | null;
  mechanics: { name: string; workshop: string | null } | null;
};

export const getMaintenanceFees = cache(async (): Promise<MaintenanceVM[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_fees")
    .select("*, vehicles(plate_number, make_model), mechanics(name, workshop)")
    .order("month", { ascending: false });

  if (error) throwDbError(error.message);

  return ((data ?? []) as unknown as RawFee[]).map((r) => ({
    ...r,
    vehicle: r.vehicles,
    mechanic: r.mechanics,
  }));
})

export async function getMechanics(): Promise<Mechanic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mechanics")
    .select("*")
    .order("name");
  if (error) throwDbError(error.message);
  return data ?? [];
}
