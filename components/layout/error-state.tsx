"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Shared presentation for every failure screen (route error, 404, global
 * crash). Kept dependency-light on purpose: global-error.tsx renders outside
 * the app shell, so this must not assume any provider is mounted.
 */
export function ErrorState({
  title,
  description,
  detail,
  onRetry,
  homeHref = "/dashboard",
}: {
  title: string;
  description: string;
  /** Technical detail — shown collapsed, never the primary message. */
  detail?: string;
  onRetry?: () => void;
  homeHref?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-expense-muted text-expense">
          <AlertTriangle className="size-6" aria-hidden />
        </span>

        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button onClick={onRetry}>
              <RotateCcw aria-hidden />
              Try again
            </Button>
          )}
          <Button variant={onRetry ? "outline" : "default"} asChild>
            <Link href={homeHref}>
              <Home aria-hidden />
              Back to dashboard
            </Link>
          </Button>
        </div>

        {detail && (
          <details className="w-full text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Technical details
            </summary>
            <p className="mt-2 break-words rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
              {detail}
            </p>
          </details>
        )}
      </Card>
    </div>
  );
}
