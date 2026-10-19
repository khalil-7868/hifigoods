import type { Metadata } from "next";
import { VehiclesView } from "@/components/vehicles/vehicles-view";
import { getVehicles } from "@/lib/queries";
import { filterBy, parseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Vehicles" };
export const dynamic = "force-dynamic";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = parseQuery(q);

  const all = await getVehicles();
  const vehicles = filterBy(all, query, (v) => [
    v.plate_number,
    v.make_model,
    v.status,
  ]);

  return (
    <VehiclesView vehicles={vehicles} totalCount={all.length} query={query} />
  );
}
