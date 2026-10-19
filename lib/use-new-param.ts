"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Opens a page's "add" dialog when it was reached with `?new=1`.
 *
 * This is how the global quick-add menu works: it navigates to the owning list
 * page (so the dialog's options — vehicles, parties, brokers — are already
 * loaded) and the page opens its own dialog on arrival. The param is stripped
 * immediately so a refresh or a back-navigation doesn't reopen it.
 */
export function useNewParam(open: () => void) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  const isNew = searchParams.get("new") === "1";

  useEffect(() => {
    if (!isNew || handled.current) return;
    handled.current = true;

    open();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    // `open` is a store action / setState and is stable enough; re-running on
    // its identity would reopen the dialog on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, pathname, router]);
}
