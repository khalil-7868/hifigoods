import type { Metadata } from "next";
import { KhataView } from "@/components/khata/khata-view";
import { getKhataContacts } from "@/lib/khata-data";
import { filterBy, parseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Khata" };
export const dynamic = "force-dynamic";

export default async function KhataPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = parseQuery(q);

  const all = await getKhataContacts();
  const contacts = filterBy(all, query, (c) => [c.name, c.phone]);

  return <KhataView contacts={contacts} allContacts={all} query={query} />;
}
