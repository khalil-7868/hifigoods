"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { VEHICLE_STATUSES } from "@/lib/database.types";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { revalidateFor } from "@/lib/revalidate";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

const vehicleSchema = z.object({
  plate_number: z
    .string()
    .trim()
    .min(2, "Plate number is required.")
    .max(20, "Plate number is too long."),
  make_model: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(
    VEHICLE_STATUSES as unknown as [string, ...string[]],
  ),
});

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

export async function addVehicle(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = vehicleSchema.safeParse({
    plate_number: formData.get("plate_number"),
    make_model: formData.get("make_model"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("vehicles").insert({
      user_id: user.id,
      plate_number: parsed.data.plate_number,
      make_model: parsed.data.make_model || null,
      status: parsed.data.status as never,
    });

    if (error) {
      // Unique violation on (user_id, plate_number).
      if (error.code === "23505") {
        return { error: "A vehicle with that plate already exists." };
      }
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("vehicles");
  return { success: true };
}

export async function removeVehicle(vehicleId: string): Promise<ActionResult> {
  if (!vehicleId) return { error: "Missing vehicle id." };

  try {
    const { supabase } = await requireUser();
    // RLS ensures a user can only delete their own vehicle.
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("vehicles");
  return { success: true };
}
