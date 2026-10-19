"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  enqueue,
  isQueueAvailable,
  serializeFormData,
  type QueuedKind,
} from "@/lib/offline/queue";

export interface OfflineSubmitResult {
  error?: string;
  success?: boolean;
  /** True when the write went to the device queue instead of the server. */
  queued?: boolean;
}

/**
 * Submit handler that survives losing signal mid-form.
 *
 * Replaces `useActionState` for the two entry forms that matter in the field.
 * The flow:
 *
 *  1. Offline already → queue it, don't bother the network.
 *  2. Online → try the action. If it *throws* (network died between loading
 *     the page and pressing save — the common case on the GT Road) queue it.
 *     If it *returns* an error, that's a validation failure: surface it and
 *     keep the form filled so it can be corrected.
 *
 * The distinction between a thrown error and a returned one is the whole trick.
 * Queueing a genuinely invalid submission would mean it silently fails again on
 * every future flush, and the operator would never find out.
 */
export function useOfflineSubmit({
  kind,
  routeId,
  action,
  describe,
  onSuccess,
}: {
  kind: QueuedKind;
  routeId: string;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  /** Short summary stored with the queued row, shown in the pending list. */
  describe: (formData: FormData) => string;
  onSuccess?: (queued: boolean) => void;
}) {
  const [state, setState] = useState<OfflineSubmitResult>({});
  const [isPending, startTransition] = useTransition();

  async function queueIt(formData: FormData): Promise<OfflineSubmitResult> {
    if (!isQueueAvailable()) {
      return {
        error:
          "No connection, and this browser won't allow saving on the device. Try again once you have signal.",
      };
    }

    const { fields, files } = serializeFormData(formData);
    await enqueue({
      kind,
      routeId,
      label: describe(formData),
      fields,
      files,
    });

    return { success: true, queued: true };
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      // Already offline — go straight to the queue.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const queued = await queueIt(formData);
        setState(queued);
        if (queued.success) {
          toast.success("Saved on this device. It will upload automatically.");
          onSuccess?.(true);
        } else if (queued.error) {
          toast.error(queued.error);
        }
        return;
      }

      try {
        const result = await action(formData);

        if (result.error) {
          // Server said no — a real validation problem, not a network one.
          setState({ error: result.error });
          return;
        }

        setState({ success: true });
        onSuccess?.(false);
      } catch {
        // Request never completed. Almost certainly lost signal.
        const queued = await queueIt(formData);
        setState(queued);
        if (queued.success) {
          toast.success(
            "Connection dropped — saved on this device and queued to upload.",
          );
          onSuccess?.(true);
        } else if (queued.error) {
          toast.error(queued.error);
        }
      }
    });
  }

  return { submit, state, isPending, reset: () => setState({}) };
}
