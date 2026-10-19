import type { Metadata } from "next";
import { BrokersView } from "@/components/brokers/brokers-view";
import { getBrokers } from "@/lib/brokers-data";
import { filterBy, parseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Brokers" };
export const dynamic = "force-dynamic";

export default async function BrokersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = parseQuery(q);

  const all = await getBrokers();
  const brokers = filterBy(all, query, (b) => [b.name, b.city, b.phone]);

  return <BrokersView brokers={brokers} allBrokers={all} query={query} />;
}
