import { BlockSkeleton, HeaderSkeleton, TilesSkeleton } from "@/components/layout/page-skeleton";

export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <HeaderSkeleton />
      <TilesSkeleton count={4} />
      <BlockSkeleton className="h-72 w-full" />
    </div>
  );
}
