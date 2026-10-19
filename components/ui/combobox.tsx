import * as React from "react";
import { cn } from "@/lib/utils";

interface ComboboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "list"> {
  /** Preset options; user can still type any custom value. */
  options: readonly string[];
}

/**
 * Searchable combo field: a text input backed by a native <datalist>.
 * Users pick a preset or type a custom label. Submits as plain text under
 * `name`, so it works inside uncontrolled forms with no extra state.
 */
const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(
  ({ id, options, className, ...props }, ref) => {
    const listId = `${id ?? "combo"}-list`;
    return (
      <>
        <input
          ref={ref}
          id={id}
          list={listId}
          autoComplete="off"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </>
    );
  },
);
Combobox.displayName = "Combobox";

export { Combobox };
