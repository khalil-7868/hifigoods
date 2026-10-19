import type { Metadata } from "next";
import { DriversView } from "@/components/drivers/drivers-view";
import { getDrivers } from "@/lib/drivers-data";
import { filterBy, parseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Drivers" };
export const dynamic = "force-dynamic";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = parseQuery(q);

  const all = await getDrivers();
  const drivers = filterBy(all, query, (d) => [
    d.name,
    d.phone,
    d.cnic,
    d.license_no,
  ]);

  return <DriversView drivers={drivers} allDrivers={all} query={query} />;
}
