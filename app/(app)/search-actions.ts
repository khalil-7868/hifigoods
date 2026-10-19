"use server";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { PATHS } from "@/lib/routes";

/**
 * Record search for the command palette.
 *
 * Deliberately narrow: it returns only what's needed to render a palette row —
 * a label, a sublabel and a href. No balances, no rollups. The palette is a
 * navigation aid, and computing ledger figures for every keystroke would make
 * it slower than just clicking through the sidebar.
 *
 * Capped per entity so one business with 400 parties can't produce a palette
 * that takes a second to render. RLS scopes every query to the caller.
 */

export interface SearchHit {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  group: string;
}

const PER_ENTITY = 5;

export async function searchRecords(term: string): Promise<SearchHit[]> {
  const q = term.trim();
  // Below two characters almost everything matches, which is noise.
  if (q.length < 2) return [];

  // PostgREST treats , . ( ) as filter syntax — strip rather than escape.
  const safe = q.replace(/[,.()%*\\]/g, " ").trim().slice(0, 50);
  if (!safe) return [];
  const pattern = `%${safe}%`;

  try {
    const [supabase] = await Promise.all([
      createClient(),
      requireCurrentUser(),
    ]);

    const [parties, brokers, drivers, vehicles, contacts, routes] =
      await Promise.all([
        supabase
          .from("parties")
          .select("id, name, city")
          .ilike("name", pattern)
          .limit(PER_ENTITY),
        supabase
          .from("brokers")
          .select("id, name, city")
          .ilike("name", pattern)
          .limit(PER_ENTITY),
        supabase
          .from("drivers")
          .select("id, name, phone")
          .ilike("name", pattern)
          .limit(PER_ENTITY),
        supabase
          .from("vehicles")
          .select("id, plate_number, make_model")
          .ilike("plate_number", pattern)
          .limit(PER_ENTITY),
        supabase
          .from("khata_contacts")
          .select("id, name, phone")
          .ilike("name", pattern)
          .limit(PER_ENTITY),
        supabase
          .from("routes")
          .select("id, origin, destination, start_date")
          .is("parent_route_id", null)
          .or(`origin.ilike.${pattern},destination.ilike.${pattern}`)
          .order("start_date", { ascending: false })
          .limit(PER_ENTITY),
      ]);

    const hits: SearchHit[] = [];

    for (const p of parties.data ?? []) {
      hits.push({
        id: p.id,
        label: p.name,
        sublabel: p.city ?? "Party",
        href: PATHS.party(p.id),
        group: "Parties",
      });
    }
    for (const b of brokers.data ?? []) {
      hits.push({
        id: b.id,
        label: b.name,
        sublabel: b.city ?? "Broker",
        href: PATHS.broker(b.id),
        group: "Brokers",
      });
    }
    for (const d of drivers.data ?? []) {
      hits.push({
        id: d.id,
        label: d.name,
        sublabel: d.phone ?? "Driver",
        href: PATHS.driver(d.id),
        group: "Drivers",
      });
    }
    for (const c of contacts.data ?? []) {
      hits.push({
        id: c.id,
        label: c.name,
        sublabel: c.phone ?? "Khata contact",
        href: PATHS.khataContact(c.id),
        group: "Khata",
      });
    }
    for (const v of vehicles.data ?? []) {
      hits.push({
        id: v.id,
        label: v.plate_number,
        sublabel: v.make_model ?? "Vehicle",
        href: PATHS.vehicles,
        group: "Vehicles",
      });
    }
    for (const r of routes.data ?? []) {
      hits.push({
        id: r.id,
        label: `${r.origin} → ${r.destination}`,
        sublabel: r.start_date,
        href: PATHS.route(r.id),
        group: "Routes",
      });
    }

    return hits;
  } catch {
    // The palette still lists pages, so a failed record search degrades
    // rather than breaking navigation.
    return [];
  }
}
