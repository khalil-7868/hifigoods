"use client";

import Link from "next/link";
import { ChevronRight, Plus, SearchX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import {
  SummaryTiles,
  type SummaryTile,
} from "@/components/entity/summary-tiles";
import { cn } from "@/lib/utils";

/**
 * The shape every list page in this app shares.
 *
 * Before this existed, Parties, Brokers, Khata, Drivers and Vehicles were five
 * near-identical 340-line files. Adding search meant four near-identical edits;
 * adding mobile cards meant four more; adding undo meant five. The duplication
 * wasn't just verbose, it was a correctness risk — each copy drifted slightly,
 * and a fix applied to four of five files looked complete in review.
 *
 * This is composition, not configuration: the caller still writes its own cells
 * and its own mobile card. What's shared is the *scaffolding* — header, tiles,
 * search, the three empty states, the responsive table/card switch, and the
 * detail-link column. A page that eventually needs something unusual can stop
 * using this without unpicking a config schema.
 *
 * ## The three empty states
 *
 * These are genuinely different and were the most commonly missed detail:
 *  · nothing exists yet          → explain the feature, offer to create
 *  · nothing matches the search  → offer to widen the search, never "create"
 *  · a precondition is unmet     → e.g. tyres need a vehicle first
 */

export interface Column<T> {
  /** Column heading. Empty string renders an unlabelled column. */
  header: string;
  /** Cell contents. */
  cell: (item: T) => React.ReactNode;
  /** Right-align numeric columns. */
  align?: "left" | "right";
  className?: string;
}

export interface EntityListProps<T> {
  /* ---- Identity ---- */
  title: string;
  description: string;
  icon: LucideIcon;

  /* ---- Data ---- */
  /** Rows after filtering — what actually renders. */
  items: T[];
  /** Total before filtering, so counts and empty states stay truthful. */
  totalCount: number;
  keyOf: (item: T) => string;

  /* ---- Optional pieces ---- */
  tiles?: SummaryTile[];
  searchPlaceholder?: string;
  /** Current ?q= value, used to pick the right empty state. */
  query?: string;

  /* ---- Create ---- */
  createLabel?: string;
  onCreate?: () => void;
  /** Set when creating isn't possible yet, e.g. "add a vehicle first". */
  blockedReason?: { title: string; description: string; icon: LucideIcon };

  /* ---- Rendering ---- */
  columns: Column<T>[];
  /** Mobile card body. Falls back to the first column when omitted. */
  renderCard?: (item: T) => React.ReactNode;
  /** Per-row action buttons, rendered in both layouts. */
  rowActions?: (item: T) => React.ReactNode;
  /** Href for the row's detail page; adds a chevron column when provided. */
  detailHref?: (item: T) => string;

  /** Dialogs and anything else the page owns. */
  children?: React.ReactNode;
}

export function EntityList<T>({
  title,
  description,
  icon: Icon,
  items,
  totalCount,
  keyOf,
  tiles,
  searchPlaceholder,
  query = "",
  createLabel,
  onCreate,
  blockedReason,
  columns,
  renderCard,
  rowActions,
  detailHref,
  children,
}: EntityListProps<T>) {
  const isSearching = query.length > 0;
  const hasAny = totalCount > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {createLabel && onCreate && (
          <Button onClick={onCreate} disabled={!!blockedReason}>
            <Plus aria-hidden />
            {createLabel}
          </Button>
        )}
      </header>

      {blockedReason ? (
        <Card>
          <EmptyState
            icon={blockedReason.icon}
            title={blockedReason.title}
            description={blockedReason.description}
          />
        </Card>
      ) : (
        <>
          {tiles && tiles.length > 0 && (
            <SummaryTiles tiles={tiles} label={`${title} summary`} />
          )}

          {hasAny && searchPlaceholder && (
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                className="w-full sm:max-w-xs"
                placeholder={searchPlaceholder}
              />
              {isSearching && (
                <p className="text-sm text-muted-foreground" role="status">
                  {items.length} of {totalCount}
                </p>
              )}
            </div>
          )}

          <Card>
            {!hasAny ? (
              <EmptyState
                icon={Icon}
                title={`No ${title.toLowerCase()} yet`}
                description={description}
                action={
                  createLabel && onCreate ? (
                    <Button variant="outline" onClick={onCreate}>
                      <Plus aria-hidden />
                      {createLabel}
                    </Button>
                  ) : undefined
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={`No matching ${title.toLowerCase()}`}
                description={`Nothing matches "${query}". Try a shorter search, or check the spelling.`}
              />
            ) : (
              <>
                {/* Mobile: one card per row. The desktop tables run to seven
                    columns, which on a phone means a horizontal scroll with no
                    affordance that more columns exist. */}
                <ul className="divide-y md:hidden" aria-label={title}>
                  {items.map((item) => (
                    <li key={keyOf(item)} className="p-4">
                      {renderCard ? (
                        renderCard(item)
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            {columns[0]?.cell(item)}
                          </div>
                          {rowActions && (
                            <div className="flex shrink-0">
                              {rowActions(item)}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Desktop: full table. */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col, i) => (
                          <TableHead
                            key={col.header || `col-${i}`}
                            className={cn(
                              col.align === "right" && "text-right",
                              col.className,
                            )}
                          >
                            {col.header}
                          </TableHead>
                        ))}
                        {(rowActions || detailHref) && (
                          <TableHead className="text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={keyOf(item)}>
                          {columns.map((col, i) => (
                            <TableCell
                              key={col.header || `col-${i}`}
                              className={cn(
                                col.align === "right" && "text-right",
                                col.className,
                              )}
                            >
                              {col.cell(item)}
                            </TableCell>
                          ))}
                          {(rowActions || detailHref) && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {rowActions?.(item)}
                                {detailHref && (
                                  <Button variant="ghost" size="icon" asChild>
                                    <Link
                                      href={detailHref(item)}
                                      aria-label={`Open details`}
                                    >
                                      <ChevronRight className="size-4" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {children}
    </div>
  );
}
