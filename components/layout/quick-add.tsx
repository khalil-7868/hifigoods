"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QUICK_ADD } from "@/lib/routes";

/**
 * Global "New" menu.
 *
 * Adding a route used to mean navigating to /operations/routes and then
 * clicking Add — two steps for the most repeated action in the app. This puts
 * every create action one tap away: a labelled button in the topbar on desktop,
 * a thumb-reachable FAB on mobile.
 *
 * The menu is generated from `QUICK_ADD` in the route registry, so a new
 * creatable section appears here automatically instead of needing to be
 * registered in a second list that can drift out of sync.
 *
 * Each item routes to the owning list page with `?new=1`, which the page reads
 * on mount (see lib/use-new-param.ts) and opens its own dialog. That indirection
 * exists because the dialogs need their option lists — vehicles, parties,
 * brokers — loaded before they can be useful.
 */
export function QuickAdd({ variant = "topbar" }: { variant?: "topbar" | "fab" }) {
  const router = useRouter();

  const trigger =
    variant === "fab" ? (
      <Button
        size="icon"
        className="size-14 rounded-full shadow-lg"
        aria-label="Create new"
      >
        <Plus className="size-6" aria-hidden />
      </Button>
    ) : (
      <Button size="sm" variant="outline">
        <Plus aria-hidden />
        New
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={variant === "fab" ? "top" : "bottom"}
        className="w-52"
      >
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {QUICK_ADD.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.key}
              onSelect={() => router.push(`${item.href}?new=1`)}
            >
              <Icon className="size-4" aria-hidden />
              {item.title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Floating action button — mobile only, sits clear of the safe area. */
export function QuickAddFab() {
  return (
    <div className="fixed bottom-6 right-4 z-40 md:hidden">
      <QuickAdd variant="fab" />
    </div>
  );
}
