# Performance work

_28 Jul 2026 · symptom: 6–10 seconds per navigation in local dev_

---

## What I measured first

**The database is not the bottleneck.** `EXPLAIN ANALYZE` on the heaviest read (all routes with per-route expense counts) reports **1.9 ms execution**, 13 shared buffer hits, no disk reads. The dataset is 9 routes and 22 expenses. Nothing in Postgres is slow.

So the time was going to framework overhead and network round-trips. Two findings:

### 1. `"dev": "next dev"` — no Turbopack

On Next 15.5, webpack recompiles each route the first time you visit it. Combined with `lucide-react` imported in **69 files** (the barrel pulls the whole icon set into each), first-visit compilation dominates. This is almost certainly the bulk of your 6–10 s.

### 2. Twelve network round-trips per dashboard navigation, in a waterfall

```
middleware   auth.getUser()          1  ← network call to the Auth server
layout       auth.getUser()          1  ← network call to the Auth server
layout       profiles                1
page         routes + expenses       1
page         vehicles                1
page         maintenance_fees        1
page         getParties  → parties   1
                        → payments   1
                        → ROUTES     1  ← duplicate
page         getBrokers  → brokers   1
                        → payments   1
                        → ROUTES     1  ← duplicate
```

`auth.getUser()` is not a local JWT decode — it sends a request to Supabase Auth **every time it is called**, and it was called in 14 places. The `routes` table was read three separate times per dashboard render, with three slightly different column lists, to compute figures from the same rows.

---

## What changed

| | Before | After |
|---|---|---|
| Auth network calls per navigation | 2 | **0** |
| `auth.getUser()` call sites | 14 | **0** |
| Round-trips per dashboard navigation | 12 | **9** |
| Reads of the `routes` table per render | 3–4 | **1** |
| Dev bundler | webpack | **Turbopack** |
| Time to first paint on click | after all queries | **immediate** (streamed) |

### Turbopack + barrel-import optimisation

`next dev --turbopack`, and `optimizePackageImports` for `lucide-react`, `recharts` and `date-fns`. `dev:webpack` is kept as an escape hatch if Turbopack ever misbehaves.

### Local JWT verification instead of Auth round-trips

The project signs JWTs with an **asymmetric ES256 key** — confirmed by fetching `/auth/v1/.well-known/jwks.json`, which publishes one. That means `auth.getClaims()` verifies the token locally via WebCrypto against a cached JWKS, with **no request leaving the server**. Identical security guarantee to `getUser()` (the signature is checked; a forged cookie is rejected), minus the network hop.

New `lib/supabase/auth.ts` exposes `getCurrentUser()` / `requireCurrentUser()` / `getCurrentProfile()`, all wrapped in React `cache()` so every caller in one render shares a single verification. All 14 `getUser()` sites now route through it — middleware, the app layout, every Server Action, and three pages.

Session refresh still works: `getClaims()` refreshes an about-to-expire token before verifying, and the middleware's `setAll` cookie handler is untouched.

### One shared read of the routes table

New `lib/route-rows.ts` — a request-memoized read selecting the union of columns that parties, brokers and drivers need, plus a shared `getMainRouteRevenue()` rollup that all three previously reimplemented. `getBrokerDetail` also stopped issuing its own filtered routes query and now filters the shared rows in memory.

All the small reference reads (`getVehicles`, `getPartyOptions`, `getBrokerOptions`, `getDriverOptions`, `getMaintenanceFees`, `getRoutesWithExpenses`) are memoized the same way.

### Streaming so the click responds immediately

The dashboard used to `await Promise.all([...9 queries])` before returning any JSX — so a click showed nothing until the slowest query returned. It's now split into independently-streamed `<Suspense>` sections: the heading paints instantly, then the attention strip, metrics and chart fill in as their data lands. Reports got the same treatment (it genuinely needs the whole book, so it's the slowest page by design).

Because the fetchers are memoized, splitting into four sections did **not** multiply queries.

### Client-side router cache

`experimental.staleTimes: { dynamic: 30, static: 180 }`. Returning to a page visited in the last 30 seconds renders from the browser tab's memory with no server work at all. This is the single biggest improvement to how navigation *feels*.

Safe for a ledger app: the cache is per-tab memory, so it's inherently scoped to the signed-in user and gone on reload — and Server Actions call `revalidatePath`, which busts it immediately, so any figure the user just changed themselves is always current.

---

## What I deliberately did NOT do

You asked for maximum-speed caching. I stopped short of server-side data caching, and the reason matters:

**`unstable_cache` is unusable here.** Its callback is forbidden from touching `cookies()`, and the Supabase server client reads the session from cookies. The only way to cache these queries server-side is to run them with the **service-role key and filter `user_id` by hand on every single query** — which bypasses Row Level Security entirely.

This app's whole security model is RLS. One forgotten `.eq("user_id", …)` in that world silently serves one transport business another's party balances and broker settlements. Trading that for a few hundred milliseconds on an app whose queries already run in 2 ms is a bad deal, so I didn't.

The audit confirms none of it crept in:

- no `unstable_cache` or `use cache` anywhere
- no service-role key anywhere
- every one of the 30 data functions still goes through the cookie-bound, RLS-enforced client
- all six `cache()` uses are React per-request memoization — no cross-request sharing, no cross-user risk

---

## Expected result, and what to check

Restart the dev server (`npm run dev` now uses Turbopack — the first start still compiles, subsequent navigations should be dramatically faster).

If it's still slow after that, the next things to measure, in order:

1. **Where you are relative to the database.** The project is in `ap-south-1` (Mumbai). Nine round-trips at 150 ms RTT is ~1.4 s of pure latency that no amount of code tidying removes. Check with `curl -w "%{time_total}" -o /dev/null -s https://hunrfdmwfgdvhkszosog.supabase.co/rest/v1/` — if that's above ~200 ms, latency is your floor and the fix is fewer round-trips (a Postgres view or RPC that returns the dashboard in one call).
2. **Whether it's compile or data.** The dev server logs compile time per route. If you see `✓ Compiled /dashboard in 4s`, it's still bundling, not querying.
3. **The service worker.** It only registers in production, so it can't be interfering in dev — but if you tested a production build earlier, an old worker may still be installed. Clear it in DevTools → Application → Service Workers.

Not yet verified: the production build. `npm install && npm run verify` is still outstanding, and the sandbox can't run your macOS `next-swc` binary.
