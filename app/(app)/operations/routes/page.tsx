import type { Metadata } from "next";
import { RoutesView } from "@/components/routes/routes-view";
import { getRoutesDetailed, ROUTES_PER_PAGE } from "@/lib/routes-data";
import { getVehicles } from "@/lib/queries";
import { getPartyOptions } from "@/lib/parties-data";
import { getBrokerOptions } from "@/lib/brokers-data";
import { getDriverOptions } from "@/lib/drivers-data";
import { parseQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Routes" };
export const dynamic = "force-dynamic";

/** Accepts YYYY-MM-DD only; anything else is ignored rather than sent to SQL. */
function parseDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    vehicle?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;

  const query = parseQuery(sp.q);
  const vehicleId = sp.vehicle ?? "all";
  const from = parseDate(sp.from);
  const to = parseDate(sp.to);
  const page = parsePage(sp.page);

  const [result, vehicles, parties, brokers, drivers] = await Promise.all([
    getRoutesDetailed({
      query,
      vehicleId,
      from,
      to,
      page,
      perPage: ROUTES_PER_PAGE,
    }),
    getVehicles(),
    getPartyOptions(),
    getBrokerOptions(),
    getDriverOptions(),
  ]);

  return (
    <RoutesView
      result={result}
      vehicles={vehicles}
      parties={parties}
      brokers={brokers}
      drivers={drivers}
      query={query}
      vehicleId={vehicleId}
      from={from ?? ""}
      to={to ?? ""}
    />
  );
}
