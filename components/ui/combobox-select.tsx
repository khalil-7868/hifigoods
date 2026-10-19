"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ComboboxSelectProps {
  options: readonly string[];
  /** Controlled value. Omit and use defaultValue for uncontrolled forms. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Submits this value under `name` inside a surrounding <form>. */
  name?: string;
  id?: string;
  placeholder?: string;
  /** When true, typing a value not in `options` offers "Use '<query>'". */
  allowCustom?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Searchable select (Popover + Command), styled like the rest of the form
 * controls. Works inside uncontrolled `action={formAction}` forms the same
 * way the plain `Combobox` does — a visually-hidden input mirrors the
 * current value under `name` so FormData picks it up on submit.
 */
export function ComboboxSelect({
  options,
  value,
  defaultValue = "",
  onValueChange,
  name,
  id,
  placeholder = "Select…",
  allowCustom = false,
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
}: ComboboxSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internalValue;

  function select(next: string) {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
    setQuery("");
    setOpen(false);
  }

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;
  const exactMatch = options.some(
    (o) => o.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input
        type="text"
        name={name}
        value={current}
        readOnly
        required={required}
        aria-hidden
        tabIndex={-1}
        className="sr-only"
      />
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between border-input bg-transparent px-3 font-normal shadow-sm",
            !current && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{current || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" id={id}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !allowCustom && (
              <CommandEmpty>No matches.</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => select(option)}
                >
                  <Check
                    className={cn(
                      "size-4",
                      current === option ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  {option}
                </CommandItem>
              ))}
              {allowCustom && query.trim() && !exactMatch && (
                <CommandItem value={query.trim()} onSelect={() => select(query.trim())}>
                  <Check className="size-4 opacity-0" aria-hidden />
                  Use &quot;{query.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
