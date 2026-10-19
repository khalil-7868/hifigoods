import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrokerLedger } from "@/components/brokers/broker-ledger";
import { getBrokerDetail } from "@/lib/brokers-data";

export const metadata: Metadata = { title: "Broker ledger" };
export const dynamic = "force-dynamic";

export default async function BrokerLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getBrokerDetail(id);
  if (!detail) notFound();

  return <BrokerLedger detail={detail} />;
}
