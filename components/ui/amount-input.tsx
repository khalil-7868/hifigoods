"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatAmountInput, parseAmountInput } from "@/lib/format";

/**
 * Money field with live digit grouping.
 *
 * A bare `<input type="number">` shows "150000", which is easy to read as
 * 15,000 — a factor-of-ten error on a field that feeds every profit figure in
 * the app. This displays "1,50,000" while typing and submits the raw digits
 * through a hidden input, so Server Actions and zod see a plain number and
 * nothing downstream has to know about formatting.
 *
 * `inputMode="numeric"` gets the number pad on a phone without `type="number"`,
 * which would reject the grouping separators.
 */
export const AmountInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
    name: string;
    defaultValue?: string | number;
    value?: string | number;
    onValueChange?: (raw: string) => void;
    /** Opening balances can be negative; payments and expenses cannot. */
    allowNegative?: boolean;
  }
>(function AmountInput(
  {
    name,
    defaultValue,
    value,
    onValueChange,
    allowNegative = false,
    className,
    ...props
  },
  ref,
) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(() =>
    formatAmountInput(defaultValue ?? "", allowNegative),
  );

  const display = isControlled
    ? formatAmountInput(value ?? "", allowNegative)
    : internal;
  const raw = parseAmountInput(display, allowNegative);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = formatAmountInput(e.target.value, allowNegative);
    if (!isControlled) setInternal(next);
    onValueChange?.(parseAmountInput(next, allowNegative));
  }

  return (
    <>
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        className={cn("tabular-nums", className)}
      />
      {/* What the server actually receives. */}
      <input type="hidden" name={name} value={raw} />
    </>
  );
});
