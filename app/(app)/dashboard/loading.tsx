import { BlockSkeleton, HeaderSkeleton, TilesSkeleton } from "@/components/layout/page-skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <HeaderSkeleton />
      <TilesSkeleton count={4} />
      <BlockSkeleton className="h-80 w-full" />
    </div>
  );
}
