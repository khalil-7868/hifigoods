import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { QuickAddFab } from "@/components/layout/quick-add";
import { OfflineProvider } from "@/components/pwa/offline-provider";
import { CommandPalette } from "@/components/layout/command-palette";

/**
 * Protected application shell. Middleware already guards these routes, but we
 * re-check on the server so Server Components have a guaranteed user.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Both resolve without a network call to the Auth server, and both are
  // memoized per request — see lib/supabase/auth.ts.
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Keyboard users would otherwise tab through all 8 nav links on every
          page load before reaching the content. Visible only on focus. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={user.email ?? ""}
          fullName={profile?.full_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
        />
        {/* Connection state + queued-write banner. Renders nothing when
            online with an empty queue. */}
        <OfflineProvider />

        {/* pb-24 on mobile keeps the FAB from covering the last row. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 pb-24 outline-none sm:p-6 md:pb-6"
        >
          {children}
        </main>
      </div>
      <QuickAddFab />
      <CommandPalette />
    </div>
  );
}
