"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { QuickAdd } from "@/components/layout/quick-add";
import { useUIStore } from "@/stores/ui-store";
import { findDestination, findGroup } from "@/lib/routes";

interface TopbarProps {
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
}

/**
 * Breadcrumbs derived from the route registry.
 *
 * Section → page, e.g. "Operations / Routes". Detail pages resolve to their
 * list page (the record's own name lives in the page heading, which already
 * shows it), so the trail stays short and never needs a data fetch.
 */
function Breadcrumbs() {
  const pathname = usePathname();
  const destination = findDestination(pathname);
  const group = findGroup(pathname);

  if (!destination) return null;

  const isDetail =
    pathname !== destination.href && pathname.startsWith(`${destination.href}/`);

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden min-w-0 items-center gap-1 text-sm md:flex"
    >
      {group && group.prefix && (
        <>
          <span className="text-muted-foreground">{group.label}</span>
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </>
      )}

      {isDetail ? (
        <>
          <Link
            href={destination.href}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {destination.title}
          </Link>
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="truncate font-medium" aria-current="page">
            Details
          </span>
        </>
      ) : (
        <span className="truncate font-medium" aria-current="page">
          {destination.title}
        </span>
      )}
    </nav>
  );
}

export function Topbar({ email, fullName, avatarUrl }: TopbarProps) {
  const { toggleSidebar, setCommandOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={toggleSidebar}
      >
        <Menu className="size-5" />
      </Button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1">
        {/* Desktop: a real search affordance, because a keyboard shortcut
            nobody knows about isn't a feature. Mobile gets the icon only. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandOpen(true)}
          className="hidden text-muted-foreground sm:inline-flex"
        >
          <Search aria-hidden />
          Search
          <kbd className="ml-2 hidden rounded border bg-muted px-1.5 font-mono text-[0.7rem] lg:inline">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Search"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="size-5" />
        </Button>

        {/* Mobile gets the FAB instead — a topbar button competes with the
            page's own primary action for thumb reach. */}
        <div className="mr-1 hidden md:block">
          <QuickAdd />
        </div>
        <ThemeToggle />
        <UserMenu email={email} fullName={fullName} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
