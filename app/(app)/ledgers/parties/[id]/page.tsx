import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartyLedger } from "@/components/parties/party-ledger";
import { getPartyDetail } from "@/lib/parties-data";

export const metadata: Metadata = { title: "Party ledger" };
export const dynamic = "force-dynamic";

export default async function PartyLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPartyDetail(id);
  if (!detail) notFound();

  return <PartyLedger detail={detail} />;
}
