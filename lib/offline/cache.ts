"use client";

import { clearQueue } from "@/lib/offline/queue";

/**
 * Purges everything the app has stored locally.
 *
 * This is a privacy requirement, not housekeeping. The service worker caches
 * rendered HTML of pages the signed-in user visited — party balances, broker
 * settlements, khata ledgers. Left in place, the next person to sign in on the
 * same device (a shared office desktop, a handed-over phone) could be served
 * the previous user's pages straight from cache while offline.
 *
 * Called on sign-out and on account deletion, before the redirect.
 */
export async function purgeLocalData(): Promise<void> {
  // 1. Queued writes — they belong to the outgoing session and would otherwise
  //    be replayed under the next user's credentials.
  try {
    await clearQueue();
  } catch {
    /* IndexedDB unavailable — nothing queued to clear. */
  }

  // 2. Cached pages and assets.
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("hifigoods-"))
          .map((k) => caches.delete(k)),
      );
    }
  } catch {
    /* Cache API blocked. */
  }

  // 3. Ask the worker to purge too, in case it re-populates from its own scope
  //    before the page unloads.
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.active?.postMessage({ type: "CLEAR_CACHES" });
  } catch {
    /* No worker registered. */
  }
}
