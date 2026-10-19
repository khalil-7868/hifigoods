"use client";

import { useEffect, useState } from "react";
import { countQueue, onQueueChange } from "@/lib/offline/queue";

/**
 * Connection status.
 *
 * Starts as `true` on the server and on first paint regardless of the real
 * state: `navigator.onLine` isn't available during SSR, and rendering an
 * offline banner into the HTML would flash it for every user on every load.
 * The real value lands in the first effect.
 *
 * Note `navigator.onLine` only means "has a network interface" — a truck
 * parked under a weak tower can report online and still fail every request.
 * That's why writes queue on failure too, not just when this returns false.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

/** Live count of writes waiting to upload. */
export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const refresh = () => {
      countQueue()
        .then((n) => {
          if (active) setCount(n);
        })
        .catch(() => {
          /* IndexedDB blocked — treat as empty. */
        });
    };

    refresh();
    const stop = onQueueChange(refresh);
    return () => {
      active = false;
      stop();
    };
  }, []);

  return count;
}
