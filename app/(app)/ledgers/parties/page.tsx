import type { Metadata } from "next";
import { PartiesView } from "@/components/parties/parties-view";
import { getParties } from "@/lib/parties-data";
import { filterBy, parseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Parties" };
export const dynamic = "force-dynamic";

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = parseQuery(q);

  const all = await getParties();
  const parties = filterBy(all, query, (p) => [p.name, p.city, p.phone]);

  // Totals stay scoped to the full book — a search narrows the list, it must
  // not make the receivables summary look like money disappeared.
  return <PartiesView parties={parties} allParties={all} query={query} />;
}
