import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, TableSkeleton } from "@/components/layout/page-skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-7 w-32" />
      <HeaderSkeleton />
      <TableSkeleton rows={3} />
      <TableSkeleton rows={2} />
    </div>
  );
}
