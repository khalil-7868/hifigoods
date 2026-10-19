"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown in the root layout itself, where
 * the normal layout (and every provider) has failed to mount. Next.js replaces
 * the whole document here, so this file MUST render its own <html>/<body> and
 * cannot use the design-system components or Tailwind classes — the stylesheet
 * may be exactly what failed to load. Styles are inlined deliberately.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          backgroundColor: "#102C3E",
          color: "#F7F4F1",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: "26rem",
            width: "100%",
            textAlign: "center",
            border: "1px solid #474A5A",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              margin: "0 0 0.5rem",
            }}
          >
            HiFiGoods couldn&apos;t start
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#B9B3AE",
              margin: "0 0 1.5rem",
              lineHeight: 1.5,
            }}
          >
            Something failed before the app could load. Reloading usually fixes
            it.
          </p>

          <button
            onClick={reset}
            style={{
              cursor: "pointer",
              backgroundColor: "#DA9C7D",
              color: "#102C3E",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.55rem 1.1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Reload
          </button>

          {error.digest && (
            <p
              style={{
                marginTop: "1.5rem",
                fontSize: "0.75rem",
                color: "#8A8580",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
