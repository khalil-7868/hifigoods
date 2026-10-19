import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteDetail } from "@/components/routes/route-detail";
import { getRouteDetail } from "@/lib/routes-data";
import { getVehicles } from "@/lib/queries";
import { getPartyOptions } from "@/lib/parties-data";
import { getBrokerOptions } from "@/lib/brokers-data";
import { getDriverOptions } from "@/lib/drivers-data";

export const metadata: Metadata = { title: "Route details" };
export const dynamic = "force-dynamic";

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [route, vehicles, parties, brokers, drivers] = await Promise.all([
    getRouteDetail(id),
    getVehicles(),
    getPartyOptions(),
    getBrokerOptions(),
    getDriverOptions(),
  ]);

  if (!route) notFound();

  return (
    <RouteDetail
      route={route}
      vehicles={vehicles}
      parties={parties}
      brokers={brokers}
      drivers={drivers}
    />
  );
}
