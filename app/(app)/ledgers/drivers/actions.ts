"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { DriverAdvance } from "@/lib/database.types";
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
  const [supabase, user] = await Promise.all([
    createClient(),
    requireCurrentUser(),
  ]);
  return { supabase, user };
}


const driverSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  cnic: z.string().trim().max(20).optional().or(z.literal("")),
  license_no: z.string().trim().max(40).optional().or(z.literal("")),
  active: z.boolean(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

function readDriver(formData: FormData) {
  return driverSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    cnic: formData.get("cnic"),
    license_no: formData.get("license_no"),
    // An unchecked checkbox submits nothing at all.
    active: formData.get("active") !== null,
    notes: formData.get("notes"),
  });
}

export async function addDriver(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = readDriver(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("drivers").insert({
      user_id: user.id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      cnic: parsed.data.cnic || null,
      license_no: parsed.data.license_no || null,
      active: parsed.data.active,
      notes: parsed.data.notes || null,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("drivers");
  return { success: true };
}

export async function updateDriver(
  driverId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = readDriver(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("drivers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        cnic: parsed.data.cnic || null,
        license_no: parsed.data.license_no || null,
        active: parsed.data.active,
        notes: parsed.data.notes || null,
      })
      .eq("id", driverId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("drivers", driverId);
  return { success: true };
}

export async function deleteDriver(driverId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("drivers").delete().eq("id", driverId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("drivers");
  return { success: true };
}

/* -------------------------------------------------------------------------- */
/* Advances (peshgi)                                                           */
/* -------------------------------------------------------------------------- */

const advanceSchema = z.object({
  amount_given: z.coerce.number().min(0, "Amount cannot be negative."),
  amount_returned: z.coerce.number().min(0, "Amount cannot be negative."),
  date: z.string().min(1, "Date is required."),
  route_id: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function addAdvance(
  driverId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = advanceSchema.safeParse({
    amount_given: formData.get("amount_given") || 0,
    amount_returned: formData.get("amount_returned") || 0,
    date: formData.get("date"),
    route_id: formData.get("route_id"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.amount_given === 0 && parsed.data.amount_returned === 0) {
    return { error: "Enter an amount given or returned." };
  }

  try {
    const { supabase, user } = await requireUser();
    const routeId =
      parsed.data.route_id && parsed.data.route_id !== "none"
        ? parsed.data.route_id
        : null;

    const { error } = await supabase.from("driver_advances").insert({
      user_id: user.id,
      driver_id: driverId,
      route_id: routeId,
      amount_given: parsed.data.amount_given,
      amount_returned: parsed.data.amount_returned,
      date: parsed.data.date,
      notes: parsed.data.notes || null,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("drivers", driverId);
  return { success: true };
}

/**
 * Records money coming back against an existing advance, and closes it when
 * nothing is left outstanding. Reading the row first (rather than trusting a
 * client-sent total) keeps concurrent returns from overwriting each other.
 */
export async function returnAdvance(
  advanceId: string,
  driverId: string,
  amount: number,
): Promise<ActionResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than zero." };
  }

  try {
    const { supabase } = await requireUser();

    const { data: row, error: readError } = await supabase
      .from("driver_advances")
      .select("amount_given, amount_returned")
      .eq("id", advanceId)
      .maybeSingle();
    if (readError) return { error: readError.message };
    if (!row) return { error: "Advance not found." };

    const given = Number(row.amount_given);
    const returned = Number(row.amount_returned) + amount;

    if (returned > given) {
      return { error: "Returned amount is more than what was given." };
    }

    const { error } = await supabase
      .from("driver_advances")
      .update({ amount_returned: returned, settled: returned >= given })
      .eq("id", advanceId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("drivers", driverId);
  return { success: true };
}

/** Marks an advance closed without a matching return — written off. */
export async function settleAdvance(
  advanceId: string,
  driverId: string,
  settled: boolean,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("driver_advances")
      .update({ settled })
      .eq("id", advanceId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("drivers", driverId);
  return { success: true };
}

/** Deletes an advance and hands the row back so the client can offer Undo. */
export async function deleteAdvance(
  advanceId: string,
  driverId: string,
): Promise<ActionResult & { restore?: DriverAdvance }> {
  let restore: DriverAdvance | undefined;
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("driver_advances")
      .delete()
      .eq("id", advanceId)
      .select()
      .maybeSingle();
    if (error) return { error: error.message };
    restore = data ?? undefined;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("drivers", driverId);
  return { success: true, restore };
}

/** Re-inserts a row removed by deleteAdvance. */
export async function restoreAdvance(
  row: DriverAdvance,
  driverId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("driver_advances").insert({
      id: row.id,
      // Session-derived, never the client's copy.
      user_id: user.id,
      driver_id: row.driver_id,
      route_id: row.route_id,
      amount_given: row.amount_given,
      amount_returned: row.amount_returned,
      date: row.date,
      settled: row.settled,
      notes: row.notes,
      created_at: row.created_at,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("drivers", driverId);
  return { success: true };
}
