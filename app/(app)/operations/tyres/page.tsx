import type { Metadata } from "next";
import { TyresView } from "@/components/tyres/tyres-view";
import { getTyres } from "@/lib/tyres-data";
import { TYRE_STATUS_LABEL } from "@/lib/tyres";
import { filterBy, parseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Tyres" };
export const dynamic = "force-dynamic";

export default async function TyresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = parseQuery(q);

  const data = await getTyres();
  const tyres = filterBy(data.tyres, query, (t) => [
    t.brand,
    t.size,
    t.serial_no,
    t.position,
    t.vehiclePlate,
    TYRE_STATUS_LABEL[t.status],
  ]);

  return <TyresView data={data} tyres={tyres} query={query} />;
}
