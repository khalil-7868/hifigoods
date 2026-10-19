"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { KhataEntry } from "@/lib/database.types";
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

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  opening_balance: z.coerce.number().default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

function parseContact(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    opening_balance: formData.get("opening_balance") || 0,
    notes: formData.get("notes"),
  });
}

export async function addKhataContact(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseContact(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("khata_contacts").insert({
      user_id: user.id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      opening_balance: parsed.data.opening_balance,
      notes: parsed.data.notes || null,
    });
    if (error) {
      if (error.code === "23505") {
        return { error: "You already have a contact with that name." };
      }
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("khata");
  return { success: true };
}

export async function updateKhataContact(contactId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseContact(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("khata_contacts")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        opening_balance: parsed.data.opening_balance,
        notes: parsed.data.notes || null,
      })
      .eq("id", contactId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("khata", contactId);
  return { success: true };
}

export async function deleteKhataContact(contactId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("khata_contacts").delete().eq("id", contactId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("khata");
  return { success: true };
}

/* ------------------------------------------------------------------ Entries */

const entrySchema = z.object({
  direction: z.enum(["gave", "got"]),
  amount: z.coerce.number().min(0.01, "Enter an amount."),
  date: z.string().min(1, "Date is required."),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function addKhataEntry(contactId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = entrySchema.safeParse({
    direction: formData.get("direction"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("khata_entries").insert({
      user_id: user.id,
      contact_id: contactId,
      direction: parsed.data.direction,
      amount: parsed.data.amount,
      date: parsed.data.date,
      notes: parsed.data.notes || null,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("khata", contactId);
  return { success: true };
}

/**
 * Deletes an entry and hands the row back so the client can offer Undo.
 * Cheaper and less error-prone than a soft-delete column: the row really is
 * gone, and restore re-inserts it verbatim under the same id.
 */
export async function deleteKhataEntry(entryId: string, contactId: string): Promise<ActionResult & { restore?: KhataEntry }> {
  let restore: KhataEntry | undefined;
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("khata_entries").delete().eq("id", entryId).select().maybeSingle();
    if (error) return { error: error.message };
    restore = data ?? undefined;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("khata", contactId);
  return { success: true, restore };
}

/** Re-inserts a row removed by deleteKhataEntry. */
export async function restoreKhataEntry(row: KhataEntry, contactId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("khata_entries").insert({
      id: row.id,
      // Never trust the client's user_id — take it from the session so a
      // tampered payload can't write into someone else's ledger.
      user_id: user.id,
      contact_id: row.contact_id,
      amount: row.amount,
      direction: row.direction,
      date: row.date,
      notes: row.notes,
      created_at: row.created_at,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("khata", contactId);
  return { success: true };
}
