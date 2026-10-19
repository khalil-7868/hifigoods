"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { PartyPayment } from "@/lib/database.types";
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

const partySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  opening_balance: z.coerce.number().default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function addParty(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = partySchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    opening_balance: formData.get("opening_balance") || 0,
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("parties").insert({
      user_id: user.id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      opening_balance: parsed.data.opening_balance,
      notes: parsed.data.notes || null,
    });
    if (error) {
      if (error.code === "23505") {
        return { error: "You already have a party with that name." };
      }
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("parties");
  return { success: true };
}

export async function updateParty(partyId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = partySchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    opening_balance: formData.get("opening_balance") || 0,
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("parties")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        city: parsed.data.city || null,
        opening_balance: parsed.data.opening_balance,
        notes: parsed.data.notes || null,
      })
      .eq("id", partyId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("parties", partyId);
  return { success: true };
}

export async function deleteParty(partyId: string): Promise<ActionResult> {
  if (!partyId) return { error: "Missing party id." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("parties").delete().eq("id", partyId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("parties");
  return { success: true };
}

/* ------------------------------------------------------------------ Payments */

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Enter an amount."),
  date: z.string().min(1, "Date is required."),
  method: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function addPayment(partyId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    method: formData.get("method"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("party_payments").insert({
      user_id: user.id,
      party_id: partyId,
      amount: parsed.data.amount,
      date: parsed.data.date,
      method: parsed.data.method,
      notes: parsed.data.notes || null,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("parties", partyId);
  return { success: true };
}

/** Deletes a payment and returns the row so the client can offer Undo. */
export async function deletePayment(paymentId: string, partyId: string): Promise<ActionResult & { restore?: PartyPayment }> {
  let restore: PartyPayment | undefined;
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("party_payments").delete().eq("id", paymentId).select().maybeSingle();
    if (error) return { error: error.message };
    restore = data ?? undefined;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("parties", partyId);
  return { success: true, restore };
}

/** Re-inserts a row removed by deletePayment. */
export async function restorePayment(row: PartyPayment, partyId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("party_payments").insert({
      id: row.id,
      // Session-derived, never the client's copy.
      user_id: user.id,
      party_id: row.party_id,
      amount: row.amount,
      date: row.date,
      method: row.method,
      notes: row.notes,
      created_at: row.created_at,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("parties", partyId);
  return { success: true };
}
