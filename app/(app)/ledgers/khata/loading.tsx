import { HeaderSkeleton, TableSkeleton, TilesSkeleton } from "@/components/layout/page-skeleton";

export default function KhataLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <HeaderSkeleton />
      <TilesSkeleton count={3} />
      <TableSkeleton rows={6} />
    </div>
  );
}
