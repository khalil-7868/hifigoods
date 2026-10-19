import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KhataLedger } from "@/components/khata/khata-ledger";
import { getKhataContactDetail } from "@/lib/khata-data";

export const metadata: Metadata = { title: "Khata ledger" };
export const dynamic = "force-dynamic";

export default async function KhataContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getKhataContactDetail(id);
  if (!detail) notFound();

  return <KhataLedger detail={detail} />;
}
