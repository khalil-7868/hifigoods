"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate, Tyre, TyreStatus } from "@/lib/database.types";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { revalidateFor } from "@/lib/revalidate";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Verified identity + a client, without a round-trip to the Auth server.
 * See lib/supabase/auth.ts — the JWT is checked locally against the project's
 * JWKS and memoized for the request, so several actions in one submission
 * share a single verification.
 */
async function requireUser() {
  const [supabase, user] = await Promise.all([createClient(), requireCurrentUser()]);
  return { supabase, user };
}

const tyreSchema = z
  .object({
    vehicle_id: z.string().uuid("Select a vehicle."),
    brand: z.string().trim().max(60).optional().or(z.literal("")),
    size: z.string().trim().max(40).optional().or(z.literal("")),
    serial_no: z.string().trim().max(60).optional().or(z.literal("")),
    position: z.string().trim().max(40).optional().or(z.literal("")),
    status: z.enum(["in_use", "spare", "retreaded", "scrapped"]),
    purchase_cost: z.coerce.number().min(0, "Cost cannot be negative."),
    purchase_date: z.string().min(1, "Purchase date is required."),
    odometer_fitted: z.coerce.number().min(0, "Odometer cannot be negative."),
    odometer_removed: z.string().optional().or(z.literal("")),
    retread_count: z.coerce.number().min(0).max(20),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((v) => !v.odometer_removed || Number(v.odometer_removed) >= v.odometer_fitted, {
    message: "Removed reading must be at or above the fitted reading.",
    path: ["odometer_removed"],
  });

function readTyre(formData: FormData) {
  return tyreSchema.safeParse({
    vehicle_id: formData.get("vehicle_id"),
    brand: formData.get("brand"),
    size: formData.get("size"),
    serial_no: formData.get("serial_no"),
    position: formData.get("position"),
    status: formData.get("status") ?? "in_use",
    purchase_cost: formData.get("purchase_cost") || 0,
    purchase_date: formData.get("purchase_date"),
    odometer_fitted: formData.get("odometer_fitted") || 0,
    odometer_removed: formData.get("odometer_removed"),
    retread_count: formData.get("retread_count") || 0,
    notes: formData.get("notes"),
  });
}

function toRow(data: z.infer<typeof tyreSchema>) {
  return {
    vehicle_id: data.vehicle_id,
    brand: data.brand || null,
    size: data.size || null,
    serial_no: data.serial_no || null,
    position: data.position || null,
    status: data.status,
    purchase_cost: data.purchase_cost,
    purchase_date: data.purchase_date,
    odometer_fitted: data.odometer_fitted,
    odometer_removed: data.odometer_removed ? Number(data.odometer_removed) : null,
    retread_count: data.retread_count,
    notes: data.notes || null,
  };
}

export async function addTyre(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = readTyre(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("tyres").insert({ user_id: user.id, ...toRow(parsed.data) });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("tyres");
  return { success: true };
}

export async function updateTyre(tyreId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = readTyre(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("tyres").update(toRow(parsed.data)).eq("id", tyreId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("tyres");
  return { success: true };
}

/**
 * Status change from the list, without opening the full form.
 *
 * Moving to `retreaded` bumps the retread count and resets the odometer
 * baseline — a retreaded tyre starts a fresh life, so measuring it from the
 * original fitting would understate every km figure from then on.
 */
export async function setTyreStatus(tyreId: string, status: TyreStatus, currentOdometer: number): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();

    const { data: tyre, error: readError } = await supabase.from("tyres").select("retread_count, odometer_fitted").eq("id", tyreId).maybeSingle();
    if (readError) return { error: readError.message };
    if (!tyre) return { error: "Tyre not found." };

    const patch: TablesUpdate<"tyres"> = { status };

    if (status === "retreaded") {
      patch.retread_count = Number(tyre.retread_count) + 1;
      patch.odometer_fitted = Math.max(Number(tyre.odometer_fitted), currentOdometer);
      patch.odometer_removed = null;
    } else if (status === "scrapped") {
      patch.odometer_removed = Math.max(Number(tyre.odometer_fitted), currentOdometer);
    } else if (status === "in_use") {
      // Refitting clears the removal reading so km life runs again.
      patch.odometer_removed = null;
    }

    const { error } = await supabase.from("tyres").update(patch).eq("id", tyreId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("tyres");
  return { success: true };
}

/** Deletes a tyre and hands the row back so the client can offer Undo. */
export async function deleteTyre(tyreId: string): Promise<ActionResult & { restore?: Tyre }> {
  let restore: Tyre | undefined;
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("tyres").delete().eq("id", tyreId).select().maybeSingle();
    if (error) return { error: error.message };
    restore = data ?? undefined;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("tyres");
  return { success: true, restore };
}

/** Re-inserts a row removed by deleteTyre. */
export async function restoreTyre(row: Tyre): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("tyres").insert({
      id: row.id,
      // Session-derived, never the client's copy.
      user_id: user.id,
      vehicle_id: row.vehicle_id,
      brand: row.brand,
      size: row.size,
      serial_no: row.serial_no,
      position: row.position,
      status: row.status,
      purchase_cost: row.purchase_cost,
      purchase_date: row.purchase_date,
      odometer_fitted: row.odometer_fitted,
      odometer_removed: row.odometer_removed,
      retread_count: row.retread_count,
      notes: row.notes,
      created_at: row.created_at,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("tyres");
  return { success: true };
}

/** Keeps a vehicle's odometer current — every km figure depends on it. */
export async function updateVehicleOdometer(vehicleId: string, odometer: number): Promise<ActionResult> {
  if (!Number.isFinite(odometer) || odometer < 0) {
    return { error: "Enter a valid odometer reading." };
  }
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("vehicles").update({ odometer }).eq("id", vehicleId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("tyres");
  return { success: true };
}
