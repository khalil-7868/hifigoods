"use client";

import {
  addDieselEntries,
  addExpenses,
} from "@/app/(app)/operations/routes/actions";
import {
  deserializeFormData,
  listQueue,
  markFailed,
  removeFromQueue,
  type QueuedKind,
  type QueuedWrite,
} from "@/lib/offline/queue";

/**
 * Replays queued writes through the same Server Actions the online path uses.
 *
 * Deliberately reuses `addExpenses` / `addDieselEntries` rather than adding a
 * bulk sync endpoint: one validation path means an offline entry can't slip
 * past a rule the online form enforces.
 */

/** Give up after this many failed attempts and leave the row for the user. */
export const MAX_ATTEMPTS = 5;

const HANDLERS: Record<
  QueuedKind,
  (routeId: string, formData: FormData) => Promise<{ error?: string }>
> = {
  expenses: (routeId, formData) => addExpenses(routeId, {}, formData),
  diesel: (routeId, formData) => addDieselEntries(routeId, {}, formData),
};

export interface FlushResult {
  synced: number;
  failed: number;
  /** Entries that hit MAX_ATTEMPTS and need the user to look at them. */
  stuck: QueuedWrite[];
}

/**
 * Flushes the queue oldest-first, stopping at the first network failure.
 *
 * Stopping matters: if the connection dropped again, hammering the remaining
 * entries just burns attempt counters and would eventually mark good rows as
 * stuck. A validation error (the server said no) is different — that entry is
 * counted as failed and the flush continues past it.
 */
export async function flushQueue(): Promise<FlushResult> {
  const entries = await listQueue();
  const result: FlushResult = { synced: 0, failed: 0, stuck: [] };

  for (const entry of entries) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      result.stuck.push(entry);
      continue;
    }

    const handler = HANDLERS[entry.kind];
    if (!handler) {
      // Unknown kind — a queue written by a newer version. Leave it alone.
      result.failed += 1;
      continue;
    }

    try {
      const response = await handler(
        entry.routeId,
        deserializeFormData(entry),
      );

      if (response.error) {
        // The server rejected it on the merits; retrying won't help much, but
        // count it so a persistent problem eventually surfaces as stuck.
        await markFailed(entry.id, response.error);
        result.failed += 1;
        continue;
      }

      await removeFromQueue(entry.id);
      result.synced += 1;
    } catch {
      // Thrown, not returned — the request never reached the server, so we're
      // almost certainly still offline.
      //
      // Deliberately NOT counted against MAX_ATTEMPTS. A truck that spends a
      // week out of coverage would otherwise burn through five flush attempts
      // on a perfectly valid entry and have it marked permanently stuck. Only
      // the server rejecting the data on its merits counts as an attempt.
      result.failed += 1;
      break;
    }
  }

  return result;
}
