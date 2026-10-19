import { HeaderSkeleton, TableSkeleton } from "@/components/layout/page-skeleton";

export default function MaintenanceLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <HeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
