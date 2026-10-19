import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SummaryTile {
  label: string;
  value: string;
  tone?: "profit" | "expense" | "neutral";
}

/**
 * The row of headline figures above a list.
 *
 * Every ledger page had its own private `Tile` component — five copies of the
 * same twenty lines, which is why changing the look meant five edits.
 *
 * Column count is derived from the number of tiles rather than passed in: the
 * caller shouldn't have to know that three tiles want `sm:grid-cols-3`.
 */
export function SummaryTiles({
  tiles,
  label = "Summary",
}: {
  tiles: SummaryTile[];
  /** Accessible name for the section. */
  label?: string;
}) {
  if (tiles.length === 0) return null;

  const columns =
    tiles.length >= 4
      ? "sm:grid-cols-2 xl:grid-cols-4"
      : tiles.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <section aria-label={label} className={cn("grid gap-4", columns)}>
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                tile.tone === "profit" && "text-profit",
                tile.tone === "expense" && "text-expense",
              )}
            >
              {tile.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
