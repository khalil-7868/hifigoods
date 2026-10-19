import type { Metadata } from "next";
import { Suspense } from "react";
import { BlockSkeleton } from "@/components/layout/page-skeleton";
import { ReportsView } from "@/components/reports/reports-view";
import { getAllRoutesDetailed } from "@/lib/routes-data";
import { getVehicles } from "@/lib/queries";
import { getMaintenanceFees } from "@/lib/maintenance-data";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

/**
 * The heading renders immediately; the report itself streams.
 *
 * Reports genuinely need the whole book (they total every route), so this is
 * the slowest page in the app by design. Streaming means the user sees the page
 * respond to their click straight away instead of staring at a dead screen
 * while the full history loads.
 */
export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="no-print">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Filter and print profit &amp; expense summaries.
        </p>
      </header>

      <Suspense fallback={<BlockSkeleton className="h-96 w-full" />}>
        <ReportBody />
      </Suspense>
    </div>
  );
}

async function ReportBody() {
  const [user, routes, vehicles, maintenance] = await Promise.all([
    getCurrentUser(),
    // Reports total the whole book, so this one stays unpaginated.
    getAllRoutesDetailed(),
    getVehicles(),
    getMaintenanceFees(),
  ]);

  return (
    <ReportsView
      routes={routes}
      vehicles={vehicles}
      owner={user?.email ?? ""}
      maintenance={maintenance}
    />
  );
}
