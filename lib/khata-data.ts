/**
 * SERVER-ONLY. Imports supabase/server (next/headers).
 * Client-safe helpers/types live in lib/khata.ts.
 */
import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import { buildKhataLedger, type KhataContactVM, type KhataLedgerEntry } from "@/lib/khata";
import type { KhataContact } from "@/lib/database.types";

export async function getKhataContacts(): Promise<KhataContactVM[]> {
  const supabase = await createClient();

  const [contactsRes, entriesRes] = await Promise.all([
    supabase.from("khata_contacts").select("*").order("name"),
    supabase.from("khata_entries").select("contact_id, direction, amount"),
  ]);

  if (contactsRes.error) throwDbError(contactsRes.error.message);
  if (entriesRes.error) throwDbError(entriesRes.error.message);

  const totals = new Map<string, { gave: number; got: number; count: number }>();
  for (const e of entriesRes.data ?? []) {
    const t = totals.get(e.contact_id) ?? { gave: 0, got: 0, count: 0 };
    if (e.direction === "gave") t.gave += Number(e.amount);
    else t.got += Number(e.amount);
    t.count += 1;
    totals.set(e.contact_id, t);
  }

  return (contactsRes.data ?? []).map((c: KhataContact) => {
    const t = totals.get(c.id) ?? { gave: 0, got: 0, count: 0 };
    return {
      ...c,
      gave: t.gave,
      got: t.got,
      balance: Number(c.opening_balance) + t.gave - t.got,
      entryCount: t.count,
    };
  });
}

export interface KhataContactDetail {
  contact: KhataContactVM;
  entries: KhataLedgerEntry[];
}

export async function getKhataContactDetail(
  id: string,
): Promise<KhataContactDetail | null> {
  const supabase = await createClient();

  const [contactRes, entriesRes] = await Promise.all([
    supabase.from("khata_contacts").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("khata_entries")
      .select("*")
      .eq("contact_id", id)
      .order("date", { ascending: true }),
  ]);

  if (contactRes.error) throwDbError(contactRes.error.message);
  if (!contactRes.data) return null;
  if (entriesRes.error) throwDbError(entriesRes.error.message);

  const contact = contactRes.data;
  const raw = entriesRes.data ?? [];
  const entries = buildKhataLedger(Number(contact.opening_balance), raw);

  const gave = raw
    .filter((e) => e.direction === "gave")
    .reduce((s, e) => s + Number(e.amount), 0);
  const got = raw
    .filter((e) => e.direction === "got")
    .reduce((s, e) => s + Number(e.amount), 0);

  return {
    contact: {
      ...contact,
      gave,
      got,
      balance: Number(contact.opening_balance) + gave - got,
      entryCount: raw.length,
    },
    entries,
  };
}
