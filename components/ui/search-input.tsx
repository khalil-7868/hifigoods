"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Debounced search box backed by a URL query param.
 *
 * State lives in the URL rather than component state so a search survives a
 * refresh, is shareable, and works with the browser back button. Typing is
 * debounced and pushed with `replace` so it doesn't stack history entries.
 */
export function SearchInput({
  placeholder = "Search…",
  paramName = "q",
  debounceMs = 300,
  className,
  /** Params to clear when the query changes — e.g. reset pagination. */
  resetParams = ["page"],
}: {
  placeholder?: string;
  paramName?: string;
  debounceMs?: number;
  className?: string;
  resetParams?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep in sync when the URL changes from elsewhere (back button, reset link).
  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  useEffect(() => {
    if (value === urlValue) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      for (const p of resetParams) params.delete(p);

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    }, debounceMs);

    return () => clearTimeout(timer);
    // `searchParams` is intentionally excluded: it changes as a result of this
    // effect, and including it would re-fire the debounce on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, urlValue, debounceMs, paramName, pathname, router]);

  function clear() {
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {(isPending || value) && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          {isPending ? (
            <span className="flex size-8 items-center justify-center">
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-hidden
              />
              <span className="sr-only">Searching</span>
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Clear search"
              onClick={clear}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
