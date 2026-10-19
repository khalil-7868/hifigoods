import type { NextConfig } from "next";
import { LEGACY_REDIRECTS, SECTION_REDIRECTS } from "./lib/route-paths";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Old flat URLs → new nested ones.
   *
   * Sourced from `lib/route-paths.ts` (deliberately dependency-free, so Next
   * can load it in plain Node) rather than written here,
   * so the redirect list can never disagree with the paths themselves.
   *
   * `permanent: false` deliberately: a 308 is cached by the browser forever, and
   * if these paths ever move again a stale permanent redirect is very hard to
   * clear from users' machines. A 307 costs one extra request and stays fixable.
   *
   * Detail pages are matched with a wildcard so a bookmarked
   * /parties/<uuid> still lands on the right ledger.
   */
  async redirects() {
    return [
      // Old flat URLs, including their detail pages.
      ...LEGACY_REDIRECTS.flatMap(({ from, to }) => [
        { source: from, destination: to, permanent: false },
        {
          source: `${from}/:path*`,
          destination: `${to}/:path*`,
          permanent: false,
        },
      ]),
      // Section roots have no page of their own — send them to their first item
      // rather than 404ing someone who trimmed the URL to "go up".
      ...SECTION_REDIRECTS.map(({ from, to }) => ({
        source: from,
        destination: to,
        permanent: false,
      })),
    ];
  },

  images: {
    // Allow serving receipt images/thumbnails from Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  experimental: {
    /**
     * Client-side router cache lifetime.
     *
     * This is the biggest win for how fast navigation *feels*, and it is safe
     * where server-side caching is not: the cache lives in the browser tab's
     * memory, so it is inherently scoped to the signed-in user and gone on
     * reload. Returning to a page you just visited renders from memory instead
     * of re-running every query against Mumbai.
     *
     * 30s for dynamic pages is a deliberate compromise for a ledger app: long
     * enough that flicking between Routes and Parties is instant, short enough
     * that a balance is never meaningfully out of date. Server Actions call
     * revalidatePath, which busts this cache immediately — so any figure the
     * user just changed themselves is correct regardless of this window.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },

    /**
     * lucide-react is imported in 69 files. Without this the barrel file pulls
     * the whole icon set into each one, which is a large part of why
     * first-visit route compilation is slow in dev.
     */
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
