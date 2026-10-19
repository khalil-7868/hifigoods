import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Served by the service worker when a page is requested with no connection and
 * no cached copy. Deliberately static — it has to render from cache, so it
 * cannot read the database or the session.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <WifiOff className="size-6" aria-hidden />
        </span>

        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">
            You&apos;re offline
          </h1>
          <p className="text-sm text-muted-foreground">
            This page hasn&apos;t been opened on this device yet, so there is no
            saved copy to show.
          </p>
        </div>

        <div className="w-full space-y-2 rounded-lg border bg-muted/30 p-4 text-left">
          <p className="text-sm font-medium">What still works offline</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· Pages you&apos;ve already visited on this device</li>
            <li>
              · Adding road expenses and diesel fills — they save on the device
              and upload by themselves once you have signal
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          This page will load as soon as you&apos;re back online.
        </p>
      </Card>
    </div>
  );
}
