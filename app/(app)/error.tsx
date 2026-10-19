"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/layout/error-state";

/**
 * Catches render/data errors inside the authenticated app shell. The sidebar
 * and topbar stay mounted, so the user can navigate away instead of being
 * stranded on a blank page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the server logs / Vercel dashboard via the digest.
    console.error("App route error:", error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      description="We couldn't load this page. This is usually temporary — trying again often fixes it."
      detail={error.digest ? `Reference: ${error.digest}` : error.message}
      onRetry={reset}
    />
  );
}
