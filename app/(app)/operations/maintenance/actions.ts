"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

const monthSchema = z.string().regex(/^\d{4}-\d{2}-01$/, "Pick a valid month.");

/**
 * Save the maintenance amount for every vehicle for one month in a single
 * submit. Fields are `amount-<vehicleId>`; blank means "no fee", which
 * removes any existing row so the month reads as zero rather than stale.
 */
export async function saveMonthlyFees(month: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsedMonth = monthSchema.safeParse(month);
  if (!parsedMonth.success) {
    return { error: parsedMonth.error.issues[0]?.message ?? "Invalid month." };
  }

  try {
    const { supabase, user } = await requireUser();

    const upserts: {
      user_id: string;
      vehicle_id: string;
      month: string;
      amount: number;
      mechanic_id: string | null;
    }[] = [];
    const clears: string[] = [];

    for (const [key, raw] of formData.entries()) {
      if (!key.startsWith("amount-")) continue;
      const vehicleId = key.slice("amount-".length);
      const text = String(raw).trim();

      if (text === "") {
        clears.push(vehicleId);
        continue;
      }
      const amount = Number(text);
      if (!Number.isFinite(amount) || amount < 0) {
        return { error: "Amounts must be zero or more." };
      }

      const mechanicRaw = formData.get(`mechanic-${vehicleId}`);
      const mechanicId = mechanicRaw && String(mechanicRaw) !== "none" ? String(mechanicRaw) : null;

      upserts.push({
        user_id: user.id,
        vehicle_id: vehicleId,
        month: parsedMonth.data,
        amount,
        mechanic_id: mechanicId,
      });
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from("maintenance_fees").upsert(upserts, { onConflict: "vehicle_id,month" });
      if (error) return { error: error.message };
    }

    if (clears.length > 0) {
      const { error } = await supabase.from("maintenance_fees").delete().eq("month", parsedMonth.data).in("vehicle_id", clears);
      if (error) return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("maintenance");
  return { success: true };
}

/* ---------------------------------------------------------------- Mechanics */

const mechanicSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  workshop: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function addMechanic(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = mechanicSchema.safeParse({
    name: formData.get("name"),
    workshop: formData.get("workshop"),
    phone: formData.get("phone"),
    city: formData.get("city"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("mechanics").insert({
      user_id: user.id,
      name: parsed.data.name,
      workshop: parsed.data.workshop || null,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
    });
    if (error) {
      if (error.code === "23505") {
        return { error: "You already have a mechanic with that name." };
      }
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("maintenance");
  return { success: true };
}

export async function deleteMechanic(id: string): Promise<ActionResult> {
  if (!id) return { error: "Missing id." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("mechanics").delete().eq("id", id);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("maintenance");
  return { success: true };
}

export async function deleteMaintenanceFee(id: string): Promise<ActionResult> {
  if (!id) return { error: "Missing id." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("maintenance_fees").delete().eq("id", id);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("maintenance");
  return { success: true };
}
