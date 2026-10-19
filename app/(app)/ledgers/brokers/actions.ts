"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { BrokerPayment } from "@/lib/database.types";
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

const brokerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

function parseBroker(formData: FormData) {
  return brokerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    notes: formData.get("notes"),
  });
}

export async function addBroker(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseBroker(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("brokers").insert({
      user_id: user.id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      notes: parsed.data.notes || null,
    });
    if (error) {
      if (error.code === "23505") {
        return { error: "You already have a broker with that name." };
      }
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("brokers");
  return { success: true };
}

export async function updateBroker(brokerId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseBroker(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("brokers")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        city: parsed.data.city || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", brokerId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("brokers", brokerId);
  return { success: true };
}

export async function deleteBroker(brokerId: string): Promise<ActionResult> {
  if (!brokerId) return { error: "Missing broker id." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("brokers").delete().eq("id", brokerId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("brokers");
  return { success: true };
}

/* ------------------------------------------------------- Rent settlements */

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Enter an amount."),
  date: z.string().min(1, "Date is required."),
  method: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

/** Record rent the broker has handed over. Allocated to legs oldest-first. */
export async function addBrokerPayment(brokerId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
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
    const { error } = await supabase.from("broker_payments").insert({
      user_id: user.id,
      broker_id: brokerId,
      amount: parsed.data.amount,
      date: parsed.data.date,
      method: parsed.data.method,
      notes: parsed.data.notes || null,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("brokers", brokerId);
  return { success: true };
}

/** Deletes a settlement and returns the row so the client can offer Undo. */
export async function deleteBrokerPayment(paymentId: string, brokerId: string): Promise<ActionResult & { restore?: BrokerPayment }> {
  let restore: BrokerPayment | undefined;
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("broker_payments").delete().eq("id", paymentId).select().maybeSingle();
    if (error) return { error: error.message };
    restore = data ?? undefined;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("brokers", brokerId);
  return { success: true, restore };
}

/** Re-inserts a row removed by deleteBrokerPayment. */
export async function restoreBrokerPayment(row: BrokerPayment, brokerId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("broker_payments").insert({
      id: row.id,
      // Session-derived, never the client's copy.
      user_id: user.id,
      broker_id: row.broker_id,
      route_id: row.route_id,
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
  revalidateFor("brokers", brokerId);
  return { success: true };
}
