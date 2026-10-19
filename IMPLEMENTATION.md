# Implementation — P0, P1, P2, Sprint 4, PWA

_28 Jul 2026 · companion to `UX-AUDIT.md`_

**All three audit tiers, Drivers, Tyres and offline entry are implemented. Typecheck: 0 errors.**

---

## Run this first

Two npm installs happened mid-session and the sandbox couldn't finish them. On your machine:

```bash
npm install          # picks up @supabase/ssr@0.7, eslint 9 + eslint-config-next
npm run verify       # typecheck → lint → build
```

`npm run verify` is new. `npm run db:types` regenerates types from the live schema.

Typecheck is confirmed at **0 errors**. The production build could not be run here — the Linux sandbox can't execute your macOS `next-swc` binary (bus error). Your `@next/swc-darwin-arm64` is intact and untouched.

One manual step, dashboard only: **Auth → Providers → Email → enable "Leaked password protection"**.

---

## Database (applied live to HiFiGoodsV3)

| Migration | What |
|---|---|
| `migration_09.sql` | Was never applied. Now live: `routes.material/weight/notes`, `broker_payments.route_id`, `maintenance_events` table. **This unblocks todos #7 and #8, which were coded but failing at runtime.** |
| `migration_10.sql` | New. RLS init-plan rewrite + security hardening + FK index. |

### Results, measured before and after

| | Before | After |
|---|---|---|
| Policies with bare `auth.uid()` | 63 | **0** |
| Security advisories | 6 | **2** |
| Performance advisories (WARN) | 63 | **0** |
| Auth users missing a `profiles` row | 1 | **0** |
| Tables | 16 | 17 |

The RLS rewrite wraps every `auth.uid()` in a scalar subquery so Postgres evaluates it once per query as an InitPlan instead of once per row scanned. Written as a dynamic `DO` block over `pg_policies`, so no policy was missed and it's safe to re-run.

Also: `handle_updated_at` search_path pinned; `handle_new_user()` EXECUTE revoked from `anon` and `authenticated` (it was callable over `/rest/v1/rpc/`); the public `avatars` bucket's broad SELECT policy dropped (it allowed clients to list every file); orphan profile backfilled.

**The 2 remaining advisories are both expected.** `delete_current_user()` stays callable by `authenticated` because the Settings danger zone depends on it and it only ever deletes its own row. Leaked-password protection is the dashboard toggle above.

---

## P0 — blocking

**1. TypeScript: 96 errors → 0.**

Root cause was not the hand-written types. `@supabase/ssr@0.5.2` used the old three-generic `SupabaseClient<Database, SchemaName, Schema>` signature that `supabase-js@2.110` dropped, so the generic silently collapsed every query result to `never`. Fixed by upgrading to `@supabase/ssr@0.7`, pinning `supabase-js@^2.110`, and splitting types into:

- `lib/supabase/database-generated.ts` — generated from the live schema, never hand-edited
- `lib/database.types.ts` — re-exports it, plus row aliases, `TablesInsert`/`TablesUpdate` payload types, and domain constants

Restoring the type checker immediately surfaced **four real bugs it had been hiding**:

- `add-vehicle-dialog.tsx` used `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` — **none of them imported**. This would have thrown at runtime.
- `batch-expense-form.tsx` wrote to `row.description`, a field absent from the `Row` interface. The audit called this dead code; it was the opposite — the field was missing from the type while the UI depended on it.
- `routes/actions.ts` typed an expense update payload as `Record<string, unknown>`, defeating column checking entirely.
- `broker_commission_type` is a nullable `text` column being passed where a `"fixed" | "percent"` union was expected. Added `asBrokerCommissionType()` (plus `asExpenseKind`, `asKhataDirection`) to narrow at the boundary — an unexpected legacy value degrades to null rather than lying to the form.

**2. Error boundaries.** There were none. Added `app/(app)/error.tsx` (retry + digest), `app/(app)/not-found.tsx`, `app/not-found.tsx`, and `app/global-error.tsx`. The global one is deliberately styled with inline CSS and no imports — it renders when the root layout itself failed, so the stylesheet may be exactly what's broken. All four detail pages already called `notFound()`; they just had nothing to render.

**3. Destructive deletes.** Parties, brokers and khata contacts deleted whole ledgers straight from a trash icon. Added `components/ui/confirm-dialog.tsx` and applied it to every destructive action — including the payment/entry rows in all three ledgers, which were also unguarded. Each dialog names what's lost ("…and every payment recorded against them. An outstanding balance of PKR 84,000 will no longer be tracked"). Route deletion was refactored onto the same component so there's one implementation. Mechanics uses an inline two-step confirm instead, because that list already lives inside a Dialog and nesting modals breaks focus trapping.

**4. Shared pending state.** One `useTransition` was shared by every row, so deleting party #3 spun every delete button and disabled the whole column. Now keyed to the row being acted on.

**5. Assets.** `public/` did not exist. Added generated icons (`app/icon.svg`, `apple-icon.png`, 192/512/maskable PNGs), a 1200×630 OG image, `app/manifest.ts`, `metadataBase`, Open Graph + Twitter cards, and light/dark `themeColor`. The app is `noindex` (it's private data behind auth); the marketing page opts back in.

**6. ESLint.** `next lint` was deprecated in Next 15 — lint had silently stopped running. Replaced with `eslint.config.mjs` (flat config) and `"lint": "eslint ."`.

---

## P1 — daily friction

**7. Search.** Not one page read `searchParams`. Added `components/ui/search-input.tsx` — debounced, URL-backed via `?q=`, `router.replace` so it doesn't stack history, with a pending spinner and clear button. Wired into Routes, Parties, Brokers, Khata and Vehicles. Matching (`lib/search.ts`) is accent-folded, case-insensitive and token-AND, so "rahim yar" finds "Rahim Yar Khan".

Summary tiles deliberately stay scoped to the **full** book while searching — narrowing a list must not make it look like money disappeared.

**8. Routes filters + pagination.** This was the real performance problem: the page fetched every route with every nested expense on each render, uncached. `getRoutesDetailed()` now filters and paginates in Postgres and loads only the current page's legs. 20 per page.

A subtlety worth knowing: a text search resolves matching **leg** ids up to their parent first, so searching a leg's destination still surfaces the trip that contains it. User input is stripped of PostgREST filter syntax (`, . ( ) %`) rather than escaped. Reports switched to a new explicit `getAllRoutesDetailed()`, since reports must total the whole book.

**9. Mobile layouts.** The brokers table was 7 columns behind a horizontal scroll with no affordance that more existed — on the device these users actually carry. Below `md`, Parties/Brokers/Khata/Vehicles now render one card per row with the name and balance prominent.

**10. Dashboard "needs attention".** The four stat cards answer *how did we do*; nothing answered *what do I chase today*. New strip above them: parties owing (sorted by amount), brokers to settle, trips still open (`end_date is null`), idle vehicles. Every row links to the record. The whole section collapses to a single "nothing needs chasing" line when it's empty, rather than showing four empty boxes.

**11. Quick add.** Creating anything meant navigating to a list, then clicking Add. Added a `+ New` topbar menu on desktop and a thumb-reachable FAB on mobile. It routes to the owning list with `?new=1` (so the dialog's vehicle/party/broker options are loaded), the page opens its own dialog via `useNewParam`, and the param is stripped so a refresh doesn't reopen it.

---

## Files added

```
app/(app)/error.tsx              app/global-error.tsx
app/(app)/not-found.tsx          app/not-found.tsx
app/manifest.ts                  app/icon.svg
app/apple-icon.png               app/opengraph-image.png
public/icon-{192,512,maskable-512}.png

components/ui/confirm-dialog.tsx    components/ui/search-input.tsx
components/ui/empty-state.tsx       components/ui/pagination.tsx
components/layout/error-state.tsx   components/layout/quick-add.tsx
components/routes/routes-filters.tsx
components/dashboard/attention-strip.tsx

lib/search.ts                    lib/use-new-param.ts
lib/supabase/database-generated.ts
eslint.config.mjs                supabase/migration_10.sql

# P2
components/ui/amount-input.tsx      components/ui/date-field.tsx
components/ui/receipt-viewer.tsx
components/dashboard/onboarding-checklist.tsx
lib/use-undoable-delete.ts

# Sprint 4
lib/drivers-data.ts                 lib/tyres-data.ts
app/(app)/drivers/{actions.ts,page.tsx,loading.tsx,[id]/page.tsx,[id]/loading.tsx}
app/(app)/tyres/{actions.ts,page.tsx,loading.tsx}
components/drivers/{drivers-view,driver-dialog,driver-ledger,advance-dialog}.tsx
components/tyres/{tyres-view,tyre-dialog,odometer-field}.tsx

# PWA / offline
public/sw.js                        app/offline/page.tsx
lib/offline/{queue,sync,cache,use-online,use-offline-submit}.ts
components/pwa/offline-provider.tsx
components/layout/sign-out-button.tsx
```

---

## P2 — polish

**12. Undo instead of confirm, on row-level deletes.** Putting a confirm dialog on every ledger row (as P0 did) was the wrong call — those rows are entered and corrected constantly, so a modal sits on the common path. Now the split follows the standard rule: **cascading entity deletes** (party, broker, khata contact, route, vehicle) keep the confirm dialog; **individual financial rows** (expense, diesel fill, party payment, broker settlement, khata entry) delete immediately with an 8-second Undo toast naming the amount.

Undo works without a soft-delete column: the delete action returns the deleted row via `.delete().select()`, and restore re-inserts it under the same id, so ledger ordering and references survive. `user_id` is always taken from the session on restore, never from the client payload — otherwise a tampered request could write into someone else's ledger. All five share `lib/use-undoable-delete.ts`.

**Known trade-off:** `deleteExpense` no longer eagerly deletes the receipt file from storage, because doing so would make Undo lossy — the row would return pointing at a missing object. This was already inconsistent (deleting a *route* cascades its expenses in the database and never ran that cleanup at all, so those receipts are orphaned today regardless). **Follow-up needed:** a scheduled sweep of objects under `receipts/` with no matching `expenses` row.

**13. Amount inputs.** All 12 money fields now group digits as you type — "150000" displays as "1,50,000". The raw value goes to the server through a hidden input, so Server Actions and zod are unchanged. Uses `inputMode="numeric"` for the phone number pad rather than `type="number"`, which would reject the separators. Opening-balance fields opt into `allowNegative`.

**14. Dates.** Three fixes:

- `formatDate` moved from `en-US` to `en-PK` — mixing "Jul 28, 2026" with "PKR 1,50,000" read as two different apps
- **Timezone bug:** `new Date("2026-07-28")` parses as UTC midnight, which renders as the *previous day* west of UTC. Added `parseDateOnly` for Postgres `date` columns, which have no time or zone.
- **Second timezone bug:** four forms defaulted to `new Date().toISOString().slice(0,10)` — UTC-based, so between 00:00 and 05:00 PKT it pre-filled *yesterday*. Replaced with a local-time `todayISO()`.

New `DateField` adds Today/Yesterday buttons and a relative hint ("yesterday", "3 days ago") that catches wrong-month typos before they reach the period reports. Future dates are flagged in warning colour. Deliberately no picker dependency — the native control is already localised, keyboard accessible, and opens the OS date wheel on mobile.

**15. Receipt lightbox.** The paperclip opened a raw signed URL in a new tab, which loses the ledger context and on mobile often hands the file to a download manager. Now a modal with zoom steps for images, an iframe for PDFs, and Open/Download actions.

**16. First-run onboarding.** A new account landed on four "PKR 0" cards and an empty chart. The dashboard now shows a three-step checklist until the first expense exists, ordered by the app's real dependency chain (routes need a vehicle, expenses need a route) so there's exactly one sensible next action. No dismiss button — completing the work is the dismissal.

**17. Accessibility.** The mobile drawer is hand-rolled rather than a Radix Dialog, so it had no focus management: Tab walked straight out of the open drawer into the page behind it and Escape did nothing. Added a focus trap, Escape-to-close, focus restore to the trigger, body scroll lock, and `aria-label` on the dialog. Plus a skip-to-content link — keyboard users were tabbing through all eight nav links on every page load.

---

## Sprint 4 — Drivers & Tyres

Both had schema sitting unused in migration 05 since day one, with their nav entries commented out in `lib/nav.ts`. No migration was needed — the tables, columns, RLS policies and the `tyre_status` enum were all already live and verified against the database.

**18. Drivers.** List with peshgi rollups (given / returned / outstanding) and trip counts, plus a per-driver ledger showing advance history and every trip they've run. `routes.driver_id` is now wired into the route form, so trips link to a driver and peshgi can be recorded against a specific run.

Advances are one form with both amounts, because the common case is handing over cash and getting some back at the end of the same trip — forcing two records for one hand-over doesn't match how it's settled. `returnAdvance` re-reads the row server-side rather than trusting a client-sent total, so concurrent returns can't overwrite each other, and it auto-closes the advance when nothing is left outstanding. Deleting a driver warns that marking them inactive is usually what you want: inactive drivers keep their history but drop out of the trip picker.

**19. Tyres.** Grouped by vehicle, with status (in use / spare / retreaded / scrapped), km life, cost per km, and a warning once a fitted tyre passes 60,000 km. Status changes happen from the list without opening the form. Moving a tyre to *retreaded* bumps the retread count and resets the odometer baseline — a retreaded tyre starts a fresh life, and measuring it from the original fitting would understate every km figure from then on.

**The live-data check caught a design flaw before it shipped.** Every vehicle in the database has `odometer = 0`, and my first implementation clamped km life to `0`. That would have rendered "0 km" across the whole page — presenting a missing reading as a real measurement, and silently poisoning cost-per-km. `kmRun` is now `number | null`: null means unknown, renders as "—", and the page shows a banner plus an inline odometer editor on each vehicle heading. Without that editor the entire feature would have been dead on arrival, since nothing else in the app ever sets an odometer.

---

## Sprint 5 (part) — PWA & offline entry

**20. Service worker** (`public/sw.js`). Hand-written rather than generated via Serwist or next-pwa: those integrate through the webpack config, and since the build couldn't be verified in this environment, adding a build-time dependency that fails at compile time was the wrong risk to take. This is plain JS in `/public` — readable, editable, no config.

Strategy: content-hashed `/_next/static/*` and icons cache-first; page navigations network-first falling back to the last good copy of that page, then to a static `/offline` page. **Authenticated data is never cached** — no API or Supabase responses, and non-GET requests are not intercepted at all.

**21. Offline write queue** (`lib/offline/queue.ts`). IndexedDB, hand-rolled wrapper. IndexedDB rather than localStorage because receipts are `Blob`s — base64-ing one 10 MB photo would blow localStorage's ~5 MB quota immediately. Hand-rolled rather than `idb` because this needs one object store and four operations.

An explicit queue rather than Background Sync: Background Sync is Chromium-only and fires with no UI, so the operator gets no confirmation their expense ever landed. Here the queue is visible, counted in a banner, and flushable by hand.

**22. Offline-aware forms.** Road expenses and diesel fills now route through `useOfflineSubmit`. The important distinction: **a thrown error is queued, a returned error is not.** Thrown means the request never reached the server (lost signal) — queue it. Returned means the server rejected the data on its merits — show it and keep the form filled. Queueing an invalid submission would mean it silently fails on every future flush and the operator never finds out.

**23. Sync manager.** Flushes oldest-first on reconnect with progress toasts, then `router.refresh()` to pull the real figures back in. Replays through the *same* Server Actions the online path uses, so an offline entry can't bypass a validation rule the online form enforces. Stops at the first network failure rather than burning through the rest of the queue.

**24. Sign-out purge** (`lib/offline/cache.ts`). This is a privacy requirement, not housekeeping: cached HTML contains party balances and khata ledgers, so on a shared office desktop the next person to sign in could be served the previous user's pages from cache while offline. Purges caches and the queue on both sign-out and account deletion, before the redirect.

### Two bugs found reviewing this before shipping

- **Redirect poisoning.** When a session expires, middleware bounces `/dashboard` → `/login` and the browser follows it transparently. My first version cached that response *as* `/dashboard`, so every future offline visit would show a login form forever. Fixed by refusing to cache when `response.redirected` is true.
- **Offline attempts counted as failures.** `markFailed` incremented the attempt counter on network errors too, so a truck a week out of coverage would burn through all 5 attempts and have perfectly valid entries marked permanently stuck. Now only a server-side rejection counts.

The FormData round-trip is verified by test: 7 fields preserved, receipt restored byte-for-byte with its filename, and empty file inputs correctly dropped rather than queued as 0-byte receipts.

### Honest limitations

- **Offline reads only cover pages already visited on that device.** There is no local mirror of the database, so a route never opened online won't open offline.
- **Only expenses and diesel queue.** Payments, parties, brokers, routes, drivers and tyres still need a connection. Those are office actions; expenses and diesel are the ones entered at a pump with no signal.
- **The service worker is registered in production only.** A caching worker in front of hot reload produces stale-module bugs that look like application errors.
- **`navigator.onLine` only means "has a network interface".** A truck under a weak tower reports online and still fails every request — which is why writes queue on thrown failure too, not just when the flag is false.
- **Not verified in a browser.** The logic is typechecked and the serialisation is unit-tested, but the service worker lifecycle, install prompt and real offline behaviour need testing on a device.

---

## Still open

1. **Receipt orphan sweep** — the trade-off noted in item 12 above
2. **Optimistic UI** via `useOptimistic` — the one P2 item deliberately deferred. With `revalidatePath` on every action the current round-trip is correct but not instant; doing this properly means reworking how the ledger views receive data, which is a bigger change than the rest of P2 combined and wants its own review.
3. Delete the two dead Supabase projects (`HiFiGoods`, `HiFiGoodsV2`) before a wrong-`.env` incident
4. Enable leaked-password protection (dashboard toggle)

Sprint 4 is done. Remaining roadmap: **Sprint 5** — PWA offline entry, Urdu localisation, WhatsApp statements — plus the two schema tables still unused (`vehicle_owners` for partner profit splits, `maintenance_events` for the per-vehicle repair log added in migration 09).
