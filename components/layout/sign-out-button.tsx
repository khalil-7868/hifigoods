"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { purgeLocalData } from "@/lib/offline/cache";

/**
 * Sign out, clearing locally cached pages and any queued writes first.
 *
 * The purge has to happen client-side (Cache API and IndexedDB don't exist on
 * the server) and *before* the action redirects, otherwise the next account on
 * this device could be served the previous user's cached pages while offline.
 */
export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 text-expense"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await purgeLocalData();
          await signOut();
        })
      }
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="size-4" aria-hidden />
      )}
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
