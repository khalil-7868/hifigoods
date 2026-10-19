import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DriverLedger } from "@/components/drivers/driver-ledger";
import { getDriverDetail } from "@/lib/drivers-data";

export const metadata: Metadata = { title: "Driver" };
export const dynamic = "force-dynamic";

export default async function DriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDriverDetail(id);
  if (!detail) notFound();

  return <DriverLedger detail={detail} />;
}
