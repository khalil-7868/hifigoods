"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, PATHS, findGroup, type NavGroup } from "@/lib/routes";
import { useChromeStore, useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

/**
 * Primary navigation, generated from the route registry.
 *
 * Three presentations of the same data:
 *  · desktop expanded — grouped, collapsible, labelled
 *  · desktop rail     — icon-only, for people who want the horizontal space
 *  · mobile drawer    — full width, always expanded, focus-trapped
 *
 * Group open/closed state persists per user (localStorage). The group
 * containing the current page is always shown expanded regardless of the
 * saved preference — collapsing the group you're standing in would hide where
 * you are, which is worse than ignoring the preference.
 */

function NavLinks({
  onNavigate,
  rail = false,
}: {
  onNavigate?: () => void;
  /** Icon-only mode: no labels, no group headers. */
  rail?: boolean;
}) {
  const pathname = usePathname();
  const { collapsedGroups, toggleGroup, hydrated } = useChromeStore();
  const activeGroup = findGroup(pathname);

  return (
    <nav
      className={cn(
        "flex flex-1 flex-col overflow-y-auto p-3",
        rail ? "items-center gap-1" : "gap-1",
      )}
      aria-label="Primary"
    >
      {NAV_GROUPS.map((group) => (
        <Group
          key={group.label}
          group={group}
          rail={rail}
          pathname={pathname}
          onNavigate={onNavigate}
          // Before rehydration, render every group open: that matches the
          // server HTML and avoids a hydration mismatch.
          collapsed={
            hydrated &&
            collapsedGroups.includes(group.label) &&
            activeGroup?.label !== group.label
          }
          onToggle={() => toggleGroup(group.label)}
        />
      ))}
    </nav>
  );
}

function Group({
  group,
  rail,
  pathname,
  collapsed,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  rail: boolean;
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const items = group.items.map((item) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={rail ? item.title : undefined}
        className={cn(
          "flex items-center rounded-md text-sm font-medium transition-colors",
          rail ? "size-10 justify-center" : "gap-3 px-3 py-2",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {!rail && item.title}
        {rail && <span className="sr-only">{item.title}</span>}
      </Link>
    );
  });

  if (rail) {
    // Separator instead of a label — there's no room for text.
    return (
      <div className="flex flex-col items-center gap-1">
        {group.prefix && <div className="my-1 h-px w-6 bg-border" aria-hidden />}
        {items}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between rounded-md px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        {group.label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            collapsed && "-rotate-90",
          )}
          aria-hidden
        />
      </button>
      {!collapsed && <div className="space-y-1">{items}</div>}
    </div>
  );
}

function Brand({ rail = false }: { rail?: boolean }) {
  return (
    <Link
      href={PATHS.dashboard}
      className={cn(
        "flex items-center font-semibold",
        rail ? "justify-center py-4" : "gap-2 px-5 py-4",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Truck className="size-5" aria-hidden />
      </span>
      {!rail && "HiFiGoods"}
      {rail && <span className="sr-only">HiFiGoods</span>}
    </Link>
  );
}

export function Sidebar() {
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { railCollapsed, toggleRail, hydrated } = useChromeStore();
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Match the server render until rehydration, or the rail flashes on load.
  const rail = hydrated && railCollapsed;

  /**
   * The mobile drawer is hand-rolled rather than a Radix Dialog, so focus
   * management has to be done explicitly: without this, Tab walks straight out
   * of the open drawer into the page behind it, and Escape does nothing.
   */
  useEffect(() => {
    if (!isSidebarOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const drawer = drawerRef.current;
    const focusables = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [isSidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Desktop: fixed rail, expanded or icon-only */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex",
          rail ? "w-16" : "w-64",
        )}
      >
        <Brand rail={rail} />
        <NavLinks rail={rail} />

        <div
          className={cn(
            "border-t p-2",
            rail ? "flex justify-center" : "flex justify-end",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRail}
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
            title={rail ? "Expand sidebar" : "Collapse sidebar"}
          >
            {rail ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile: slide-in drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside
            ref={drawerRef}
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-card shadow-xl"
          >
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
