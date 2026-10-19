"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatRelativeDate, todayISO } from "@/lib/format";

/**
 * Date input with Today / Yesterday shortcuts and a relative-date hint.
 *
 * Expenses are almost always entered for today or yesterday — from the road, on
 * a phone. Two taps beats opening a calendar picker. The hint underneath
 * ("yesterday", "3 days ago") catches the classic wrong-month typo before it's
 * saved, which matters because these dates drive the period reports.
 *
 * Uses the native date control rather than a picker dependency: it's already
 * localised, keyboard accessible, and on mobile it opens the OS date wheel,
 * which is better than anything we'd ship.
 */
export function DateField({
  name,
  id,
  defaultValue,
  required,
  max,
  min,
  className,
  showShortcuts = true,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  required?: boolean;
  max?: string;
  min?: string;
  className?: string;
  showShortcuts?: boolean;
}) {
  const [value, setValue] = React.useState(defaultValue ?? todayISO());

  const today = todayISO();
  const yesterday = todayISO(-1);
  const relative = value ? formatRelativeDate(value) : null;
  const isFuture = value > today;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Input
        id={id}
        name={name}
        type="date"
        value={value}
        max={max}
        min={min}
        required={required}
        onChange={(e) => setValue(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-2">
        {showShortcuts && (
          <>
            <ShortcutButton
              label="Today"
              active={value === today}
              onClick={() => setValue(today)}
            />
            <ShortcutButton
              label="Yesterday"
              active={value === yesterday}
              onClick={() => setValue(yesterday)}
            />
          </>
        )}

        {relative && (
          <span
            className={cn(
              "text-xs",
              isFuture ? "text-warning" : "text-muted-foreground",
            )}
          >
            {isFuture ? `${relative} — future date` : relative}
          </span>
        )}
      </div>
    </div>
  );
}

function ShortcutButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}
