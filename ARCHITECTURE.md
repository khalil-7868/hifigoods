# Routing & navigation architecture

_28 Jul 2026 · why the structure looks like this, and how to add to it_

---

## The problem this solved

Adding one section used to mean ~10 new files **and three registration points that nothing tied together**:

- `lib/nav.ts` — the sidebar
- `components/layout/quick-add.tsx` — a second, independent list of the same pages
- `revalidatePath("/parties")` string literals scattered across every Server Action

Nothing connected them. A path change would silently break cache invalidation while the links kept working — the most expensive kind of bug, because nothing errors, the figures just quietly stop refreshing.

And five list pages (Parties, Brokers, Khata, Drivers, Vehicles) were near-identical 340-line files. Adding search meant four almost-identical edits. Adding mobile cards, four more. Adding undo, five. A fix applied to four of five files looked complete in review.

---

## URL structure

Sections are real path segments, matching the sidebar grouping:

```
/dashboard                      ← the overview *is* the root; no /overview prefix
/reports
/operations/vehicles
/operations/routes
/operations/routes/[id]
/operations/maintenance
/operations/tyres
/ledgers/parties
/ledgers/parties/[id]
/ledgers/brokers/[id]
/ledgers/khata/[id]
/ledgers/drivers/[id]
/settings
```

**"Ledgers", not "money" or "people":** all four of those pages are a balance plus a transaction history, which is precisely what a ledger is. Drivers lives there because the page is a peshgi ledger, not a staff directory.

**Old URLs still work.** `LEGACY_REDIRECTS` in `lib/routes.ts` maps every flat path (and its detail pages, via a wildcard) to the new one, so bookmarks, old PWA shortcuts, and anything the service worker cached keep resolving. Deliberately `permanent: false` — a 308 is cached by browsers forever and is very hard to undo if paths ever move again.

**Section roots redirect rather than 404.** `/operations` and `/ledgers` have no page, but people do trim the last URL segment to go up. `SECTION_REDIRECTS` sends them to the section's first item, derived from `NAV_GROUPS` so a new section can't forget it.

**The service worker cache was bumped to `v2`** — v1 caches held pages keyed by the old flat URLs, and `activate()` deletes any `hifigoods-*` cache that isn't current.

---

## Single source of truth

`lib/routes.ts` declares `PATHS` once. Everything derives from it:

| Consumer | Derived from |
|---|---|
| Sidebar groups | `NAV_GROUPS` |
| Quick-add menu | `QUICK_ADD` (filtered on `creatable`) |
| Command palette | `ALL_DESTINATIONS` + per-item `keywords` |
| Breadcrumbs | `findDestination()` / `findGroup()` |
| Cache invalidation | `lib/revalidate.ts` |
| Legacy redirects | `LEGACY_REDIRECTS` in `next.config.ts` |
| PWA shortcuts | `app/manifest.ts` |

`lib/nav.ts` is deleted. There is no second list.

### Cache invalidation is now a declared contract

`lib/revalidate.ts` holds one `AFFECTS` map: which pages a change to each entity touches. This fixed a real inconsistency as well as the path fragility — editing a route changes party billing **and** broker rent **and** driver trip history, but only some actions remembered to invalidate all three. Now that fan-out is declared in one reviewable place:

```ts
routes: [PATHS.routes, PATHS.parties, PATHS.brokers, PATHS.drivers,
         PATHS.dashboard, PATHS.reports]
```

Verified: zero raw `revalidatePath("/…")` literals remain in any action.

---

## Shared list primitives

`components/entity/` holds the scaffolding every list page shares:

- **`EntityList`** — header, tiles, search, the three empty states, the responsive table/card switch, detail-link column
- **`SummaryTiles`** — the headline figures row (column count derived from tile count)
- **`RowActions`** — edit/delete with per-row pending state

**This is composition, not configuration.** Callers still write their own cells and their own mobile card; what's shared is the structure. A page that eventually needs an unusual layout can stop using `EntityList` without unpicking a config schema — which is why I didn't go the fully config-driven route.

The three empty states are the detail most often missed, and are genuinely different:

| State | Behaviour |
|---|---|
| Nothing exists yet | Explain the feature, offer to create |
| Nothing matches the search | Offer to widen the search, **never** offer "create" |
| Precondition unmet | e.g. tyres need a vehicle first — no create button at all |

`RowActions` exists mainly to make the pending state impossible to get wrong. Every list originally shared one `useTransition` across all rows, so deleting one record spun every delete button and disabled the whole column. That bug was written five times because the markup was copied five times.

### Effect on the five views

| View | Before | After |
|---|---|---|
| Parties | 343 | 215 |
| Brokers | 353 | 227 |
| Khata | 348 | 217 |
| Drivers | 342 | 225 |
| Vehicles | 170 | 94 |
| **Total** | **1,556** | **978** + 391 shared = **1,369** |

Raw line count is the *least* interesting number here — a ~12% reduction. **The win is that list scaffolding now has one definition instead of five.** The next change to search, empty states or mobile layout is one edit, not five near-identical ones with a chance of missing the fifth.

---

## Navigation

**Command palette (⌘K / Ctrl-K).** `cmdk` was already a dependency but only powered the combobox. The palette searches two things: pages (matched locally against the registry, including `keywords` — so "udhaar" finds Parties and "peshgi" finds Drivers) and records (a named party, broker, driver, vehicle, khata contact or trip, from the server, debounced 200ms, capped at 5 per entity).

It's exposed as a visible **Search** button in the topbar, not just a shortcut — a keybinding nobody knows about isn't a feature.

**Collapsible sidebar.** Group open/closed state and the icon-only rail persist to localStorage. Two details worth knowing:

- **The group containing the current page is always shown expanded**, regardless of the saved preference. Collapsing the group you're standing in hides where you are, which is worse than ignoring the preference.
- Persisted state is gated behind a `hydrated` flag. Reading localStorage during the first render would mismatch the server HTML; consumers render the default until rehydration finishes.

**Breadcrumbs** in the topbar, derived from the registry — "Operations / Routes". Detail pages resolve to their list page rather than fetching the record's name, since the page heading already shows it. No extra query.

---

## Adding a new section

1. Add the path to `PATHS` and a `Destination` to the right `NAV_GROUPS` entry in `lib/routes.ts`. Set `creatable: true` if it should appear in quick-add. Add `keywords` for the palette.
2. Add the entity to `AFFECTS` in `lib/revalidate.ts`, listing which pages its changes touch. Add a `DETAIL` builder if it has detail pages.
3. Create `app/(app)/<section>/<name>/{page,loading,actions}.tsx`.
4. Build the view on `EntityList`.

Sidebar, quick-add, command palette, breadcrumbs and section redirects all pick it up with no further registration.

---

## Client/server module split

Every domain has two modules, and the distinction is a **build** constraint, not a style preference:

| Client-safe (types + constants + pure helpers) | Server (queries) |
|---|---|
| `lib/khata.ts` | `lib/khata-data.ts` |
| `lib/brokers.ts` | `lib/brokers-data.ts` |
| `lib/maintenance.ts` | `lib/maintenance-data.ts` |
| `lib/tyres.ts` | `lib/tyres-data.ts` |
| `lib/route-paths.ts` | `lib/routes.ts` (imports lucide icons) |

The `-data` modules import the Supabase server client, which imports `next/headers`. Pulling any **value** (not type) from one into a `"use client"` component fails the production build with *"You're importing a component that needs next/headers"*. TypeScript does not catch this — `tsc` passes cleanly.

Two instances of this existed and are fixed:

- **`lib/tyres.ts` didn't exist.** I broke the established pattern when building Tyres: `tyres-view.tsx` and `tyre-dialog.tsx` (both client) imported `TYRE_STATUSES`, `TYRE_STATUS_LABEL` and `DEFAULT_LIFE_KM` as values from `lib/tyres-data.ts`. Constants, `TyreVM` and `TyresPage` now live in a client-safe `lib/tyres.ts`, re-exported from the data module so server imports are unchanged.
- **`next.config.ts` imported `lib/routes.ts`**, which imports lucide-react. Next evaluates the config in plain Node before any bundler exists, so dragging an ESM icon library into config loading is fragile and pointless. Path and redirect data moved to `lib/route-paths.ts`, which imports **nothing**; `lib/routes.ts` re-exports it so app code still has one import site.

Type-only imports (`import type { PartyVM } from "@/lib/parties-data"`) are fine — they erase at compile time — and are used throughout.

---

## Verified

- `tsc --noEmit`: **0 errors**
- Every `PATHS` entry resolves to a real route on disk (scripted check)
- Zero hard-coded old paths anywhere in `app/`, `components/` or `lib/`
- Zero raw `revalidatePath` literals in any Server Action
- `lib/nav.ts` deleted; one registry remains
- Service worker cache version bumped
- **No client component can reach `next/headers`** — scripted check over every `"use client"` file, following real import statements and ignoring type-only ones
- `next.config.ts`'s import chain has zero dependencies

**Still not verified: the production build.** `npm install && npm run verify` remains outstanding. The two build-breakers found above were caught by static analysis, not by a build — there may be more that only `next build` surfaces (RSC boundary violations, serialisation errors on props passed to client components, metadata conflicts). This change moved 25 route files, so a real build is the only way to exercise the route manifest and redirect table.
