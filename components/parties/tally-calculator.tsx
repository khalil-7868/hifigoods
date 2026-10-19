"use client";

import { useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Entry {
  id: number;
  value: number;
}

/**
 * Quick tally pad: add or subtract figures to reach a total (e.g. counting
 * cash), then push the result into the payment amount.
 */
export function TallyCalculator({
  onUseTotal,
  className,
}: {
  onUseTotal?: (total: number) => void;
  className?: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = entries.length
    ? Math.max(...entries.map((e) => e.id)) + 1
    : 1;

  const total = entries.reduce((s, e) => s + e.value, 0);

  function push(sign: 1 | -1) {
    const n = Number(draft);
    if (!draft.trim() || !Number.isFinite(n) || n === 0) return;
    setEntries((prev) => [...prev, { id: nextId, value: sign * Math.abs(n) }]);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      push(1);
    } else if (e.key === "-" && draft.trim() !== "") {
      e.preventDefault();
      push(-1);
    }
  }

  return (
    <div className={cn("rounded-xl border bg-muted/30 p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="tally-input" className="text-xs font-semibold">
          Tally pad
        </Label>
        {entries.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setEntries([])}
          >
            <RotateCcw className="size-3" aria-hidden />
            Clear
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          id="tally-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          type="number"
          inputMode="numeric"
          step="1"
          placeholder="Amount"
          className="h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Add amount"
          onClick={() => push(1)}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Subtract amount"
          onClick={() => push(-1)}
        >
          <Minus className="size-4" />
        </Button>
      </div>

      {entries.length > 0 && (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 odd:bg-background/60"
            >
              <span
                className={cn(
                  "tabular-nums",
                  e.value < 0 ? "text-expense" : "text-foreground",
                )}
              >
                {e.value > 0 ? "+" : "−"} {formatCurrency(Math.abs(e.value))}
              </span>
              <button
                type="button"
                aria-label="Remove entry"
                className="text-muted-foreground hover:text-expense"
                onClick={() =>
                  setEntries((prev) => prev.filter((x) => x.id !== e.id))
                }
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>
        {onUseTotal && (
          <Button
            type="button"
            size="sm"
            disabled={total === 0}
            onClick={() => onUseTotal(total)}
          >
            Use total
          </Button>
        )}
      </div>
    </div>
  );
}
