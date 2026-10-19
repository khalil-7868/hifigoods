import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, TableSkeleton, TilesSkeleton } from "@/components/layout/page-skeleton";

export default function PartyDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-8 w-32" />
      <HeaderSkeleton />
      <TilesSkeleton count={4} />
      <TableSkeleton rows={5} />
    </div>
  );
}
