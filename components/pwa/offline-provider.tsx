"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudUpload, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flushQueue, MAX_ATTEMPTS } from "@/lib/offline/sync";
import { listQueue } from "@/lib/offline/queue";
import { useOnline, usePendingCount } from "@/lib/offline/use-online";
import { cn } from "@/lib/utils";

/**
 * Registers the service worker, watches the connection, and flushes queued
 * writes when signal comes back.
 *
 * Mounted once in the app shell. Everything here is client-only and additive:
 * with JavaScript disabled or IndexedDB blocked, the app behaves exactly as it
 * did before — forms just post straight to the server.
 */
export function OfflineProvider() {
  const router = useRouter();
  const online = useOnline();
  const pending = usePendingCount();
  const [syncing, setSyncing] = useState(false);
  const wasOffline = useRef(false);

  /* ---- Service worker registration ------------------------------------- */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Skipped in dev: a caching worker in front of hot reload causes
    // confusing stale-module bugs that look like application errors.
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A failed registration costs the offline shell, nothing more.
    });
  }, []);

  /* ---- Flush ------------------------------------------------------------ */
  const sync = useCallback(
    async (announce: boolean) => {
      if (syncing) return;

      const queued = await listQueue();
      if (queued.length === 0) return;

      setSyncing(true);
      const toastId = announce
        ? toast.loading(
            `Uploading ${queued.length} saved ${queued.length === 1 ? "entry" : "entries"}…`,
          )
        : undefined;

      try {
        const result = await flushQueue();

        if (result.synced > 0) {
          toast.success(
            `${result.synced} saved ${result.synced === 1 ? "entry" : "entries"} uploaded.`,
            { id: toastId },
          );
          // The server data changed underneath us — pull the fresh figures in.
          router.refresh();
        } else if (toastId) {
          toast.dismiss(toastId);
        }

        if (result.stuck.length > 0) {
          toast.error(
            `${result.stuck.length} entry could not be uploaded after ${MAX_ATTEMPTS} tries. Open Routes to re-enter it.`,
            { duration: 12000 },
          );
        }
      } catch {
        if (toastId) toast.dismiss(toastId);
      } finally {
        setSyncing(false);
      }
    },
    [router, syncing],
  );

  /* ---- Flush on reconnect ---------------------------------------------- */
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    // Only announce when this is a genuine recovery, not the first load.
    const recovering = wasOffline.current;
    wasOffline.current = false;
    void sync(recovering);
    // `sync` is stable enough; adding it re-fires on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  /* ---- Offline notice -------------------------------------------------- */
  useEffect(() => {
    if (online) return;
    toast.warning("You're offline. Expenses will save on this device.", {
      id: "offline-notice",
      duration: 6000,
    });
  }, [online]);

  const showBar = !online || pending > 0;
  if (!showBar) return null;

  return (
    <div
      className={cn(
        "sticky top-14 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm",
        online
          ? "border-info/40 bg-info-muted text-info"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
      role="status"
      aria-live="polite"
    >
      {online ? (
        <CloudUpload className="size-4 shrink-0" aria-hidden />
      ) : (
        <WifiOff className="size-4 shrink-0" aria-hidden />
      )}

      <span className="min-w-0 flex-1">
        {!online ? (
          <>
            Offline
            {pending > 0 && (
              <>
                {" — "}
                {pending} {pending === 1 ? "entry" : "entries"} saved on this
                device
              </>
            )}
            . New expenses will keep saving here.
          </>
        ) : (
          <>
            {pending} {pending === 1 ? "entry" : "entries"} waiting to upload.
          </>
        )}
      </span>

      {online && pending > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void sync(true)}
          disabled={syncing}
          className="h-7"
        >
          {syncing && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {syncing ? "Uploading…" : "Upload now"}
        </Button>
      )}
    </div>
  );
}
