import { HeaderSkeleton, TableSkeleton } from "@/components/layout/page-skeleton";

export default function VehiclesLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <HeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
