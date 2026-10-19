"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ALL_DESTINATIONS, QUICK_ADD } from "@/lib/routes";
import { useUIStore } from "@/stores/ui-store";
import { searchRecords, type SearchHit } from "@/app/(app)/search-actions";

/**
 * ⌘K / Ctrl-K palette.
 *
 * With ten sections plus detail pages, the sidebar stops being the fastest way
 * to get anywhere. This searches two things at once:
 *
 *  · **Pages** — matched locally against the route registry, including the
 *    `keywords` on each destination, so typing "udhaar" finds Parties and
 *    "peshgi" finds Drivers even though neither word appears in the title.
 *  · **Records** — a named party, broker, driver, vehicle, khata contact or
 *    trip, fetched from the server as you type.
 *
 * Record search is debounced and runs in a transition, so the page list stays
 * interactive while results are in flight. cmdk's own filtering is disabled
 * (`shouldFilter={false}`) because the server has already decided what matches
 * — letting cmdk filter again would hide valid hits whose label doesn't contain
 * the raw query.
 */
export function CommandPalette() {
  const router = useRouter();
  const { isCommandOpen, setCommandOpen, toggleCommand } = useUIStore();

  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isSearching, startSearch] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ---- Global shortcut ------------------------------------------------- */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommand();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleCommand]);

  /* ---- Reset when closed ----------------------------------------------- */
  useEffect(() => {
    if (!isCommandOpen) {
      setTerm("");
      setHits([]);
    }
  }, [isCommandOpen]);

  /* ---- Debounced record search ----------------------------------------- */
  useEffect(() => {
    clearTimeout(debounce.current);

    if (term.trim().length < 2) {
      setHits([]);
      return;
    }

    debounce.current = setTimeout(() => {
      startSearch(async () => {
        const results = await searchRecords(term);
        setHits(results);
      });
    }, 200);

    return () => clearTimeout(debounce.current);
  }, [term]);

  function go(href: string) {
    setCommandOpen(false);
    router.push(href);
  }

  /* ---- Local page matching --------------------------------------------- */
  const needle = term.trim().toLowerCase();
  const pages = needle
    ? ALL_DESTINATIONS.filter(
        (d) =>
          d.title.toLowerCase().includes(needle) ||
          d.key.includes(needle) ||
          d.keywords?.some((k) => k.includes(needle)),
      )
    : ALL_DESTINATIONS;

  const creatable = needle
    ? QUICK_ADD.filter(
        (d) =>
          d.title.toLowerCase().includes(needle) ||
          d.keywords?.some((k) => k.includes(needle)),
      )
    : [];

  // Group server hits so each entity type gets its own heading.
  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    (acc[hit.group] ??= []).push(hit);
    return acc;
  }, {});

  return (
    <Dialog open={isCommandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Search and navigate</DialogTitle>

        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3">
          <div className="flex items-center border-b px-3">
            <Search
              className="mr-2 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <CommandInput
              value={term}
              onValueChange={setTerm}
              placeholder="Search pages, parties, brokers, drivers, trips…"
              className="border-0 focus:ring-0"
            />
            {isSearching && (
              <Loader2
                className="ml-2 size-4 shrink-0 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}
          </div>

          <CommandList className="max-h-[60vh]">
            <CommandEmpty>
              {isSearching ? "Searching…" : "Nothing matches that."}
            </CommandEmpty>

            {pages.length > 0 && (
              <CommandGroup heading="Go to">
                {pages.map((d) => {
                  const Icon = d.icon;
                  return (
                    <CommandItem
                      key={d.key}
                      value={`page-${d.key}`}
                      onSelect={() => go(d.href)}
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      {d.title}
                      <CornerDownLeft
                        className="ml-auto size-3 opacity-0 aria-selected:opacity-40"
                        aria-hidden
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {Object.entries(grouped).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((hit) => (
                  <CommandItem
                    key={`${group}-${hit.id}`}
                    value={`${group}-${hit.id}`}
                    onSelect={() => go(hit.href)}
                  >
                    <span className="truncate">{hit.label}</span>
                    <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">
                      {hit.sublabel}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {creatable.length > 0 && (
              <CommandGroup heading="Create">
                {creatable.map((d) => {
                  const Icon = d.icon;
                  return (
                    <CommandItem
                      key={`new-${d.key}`}
                      value={`new-${d.key}`}
                      onSelect={() => go(`${d.href}?new=1`)}
                    >
                      <Plus className="size-4 text-muted-foreground" aria-hidden />
                      New {d.title.replace(/s$/, "").toLowerCase()}
                      <Icon
                        className="ml-auto size-3.5 text-muted-foreground"
                        aria-hidden
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
