import {
  HeaderSkeleton,
  TableSkeleton,
  TilesSkeleton,
} from "@/components/layout/page-skeleton";

export default function DriverDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <HeaderSkeleton />
      <TilesSkeleton count={4} />
      <TableSkeleton rows={5} />
    </div>
  );
}
