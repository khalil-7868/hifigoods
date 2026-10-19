import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton } from "@/components/layout/page-skeleton";

export default function RoutesLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <HeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="flex-row items-center justify-between gap-4 border-b">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4 pt-4">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-9 w-28 shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
