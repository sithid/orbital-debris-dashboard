# Build Plan

_This file is the phased build plan for the project. It's the bridge between `docs/PRD.md` (what to build) + `docs/DESIGN.md` (what it looks like) and the actual code. Re-run the `build-plan` skill whenever reality has diverged from the plan._

> **Status:** v1 shipped; v2 globe complete through Phase 9 — Objects table + Globe now share one filter surface (incl. zombie + in_orbit)
> **Last updated:** 2026-06-04
> **Current phase:** Phase 9 complete — shared filter module (backend) + shared filter controls (frontend) drive both pages

> **Architecture note (2026-05-14):** The project was bootstrapped with `npm create cloudflare@latest` using the newer **Workers + Static Assets** model, not Pages Functions. File layout differs from this plan's original wording: API routes live in `worker/index.ts` (a single Worker entrypoint routing `/api/*`), not under `functions/api/*.ts`. Tests use `@cloudflare/vitest-pool-workers` (Vitest 4) with the `cloudflareTest` plugin. Wrangler config is `wrangler.jsonc`. The app lives in the nested directory `orbital-debris-dashboard/` (kept nested for now). Treat the original Pages-Functions file paths in later phases as historical — translate to Worker route handlers inside `worker/`.

---

## Why a build plan exists

Claude Code sessions have a finite context window. The cheaper a session is to start, the better the work tends to be. A good build plan slices the project into phases where each phase:

- Has a single user-visible outcome.
- Touches a bounded set of files.
- Names exactly which docs and files Claude should load to execute it.
- Leaves the repo in a clean, testable state at the end.

That way each phase fits in a focused session — no full-repo loads, no thrashing, no context exhaustion mid-implementation.

---

## Strategy

- **Slicing principle:** Vertical slices by user story — each phase ships one user-visible outcome end-to-end (API + UI together).
- **Critical path:** Phase 0 (scaffolding) unblocks everything. Phase 1 (home page + D1 seeding) proves the full D1→API→UI path and unblocks all later data work.
- **What was deferred on purpose:** Server-side search/filter (Phase 2), JOIN-heavy detail queries (Phase 3), and all nav/a11y polish (Phase 4) were pushed back so the data pipeline could be validated cheaply in Phase 1 before the hard UI work begins.
- **Session boundaries:** Each phase is a `/clear` boundary. Start each phase in a fresh Claude Code session loading only the files listed under "Context to load."

---

## Phases

### Phase 0 — Scaffolding

**Goal:** Repo bootstrapped with React + Vite + TypeScript, Cloudflare Pages + D1 binding wired up, deploy pipeline green.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §6, `docs/DESIGN.md` §3.

**Files this phase creates/modifies:** _(actuals, as implemented 2026-05-14 — Workers + Static Assets layout)_
- `orbital-debris-dashboard/package.json` — adds Tailwind v4, Headless UI, Heroicons, react-router-dom, Vitest, `@cloudflare/vitest-pool-workers`
- `orbital-debris-dashboard/vite.config.ts` — React + `@tailwindcss/vite` + `@cloudflare/vite-plugin`
- `orbital-debris-dashboard/wrangler.jsonc` — Worker entrypoint, static assets binding, D1 binding (`DB`, id placeholder)
- `orbital-debris-dashboard/src/index.css` — Tailwind v4 `@theme` block with DESIGN §4 tokens (no `tailwind.config.ts` — v4 is CSS-first)
- `orbital-debris-dashboard/src/App.tsx` — `<BrowserRouter>` with placeholder routes for `/`, `/objects`, `/objects/:id`, `/about`
- `orbital-debris-dashboard/worker/index.ts` — Worker that routes `/api/*` (CORS + `/api/health` → `{ ok: true }`)
- `orbital-debris-dashboard/vitest.config.ts` — `cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })`
- `orbital-debris-dashboard/worker/index.test.ts` — health + unknown-route tests via `SELF.fetch()` from `cloudflare:test`

**Tests this phase adds:**
- `health endpoint returns 200 with { ok: true }`
- `unknown /api/* route returns 404 JSON`

**Done-when:**
- [x] `npm test` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` produces a clean Vite + Worker bundle.
- [x] `npm run deploy` deployed to https://orbital-debris-dashboard.demonicurges05.workers.dev — live `GET /api/health` returns `{ ok: true }`.
- [x] Public URL committed to root `README.md`.

**Session budget:** ~1 session.

**Risks / unknowns:**
- `@cloudflare/vitest-pool-workers` config can be finicky — if it blocks progress, stub the test with a plain Vitest test and revisit.
- Tailwind v4 has a different config shape than v3 — confirm which version before writing `tailwind.config.ts`.

---

### Phase 1 — Home page with live stats

**Goal:** Home page shows live summary stats (total objects, in-orbit count, zombie count) pulled from D1.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §4 story 4 + §6, `docs/DESIGN.md` §2 (home screen) + §4 (tokens), `wrangler.toml`, `src/App.tsx`.

**Files this phase creates/modifies:**
- `schema.sql` — D1 table definitions (matches upstream `orbital_debris.db` schema)
- `scripts/seed.sh` — shell script to import `orbital_debris.db` into the local D1 database via `wrangler d1 execute`
- `functions/api/stats.ts` — `GET /api/stats` returning `{ total, inOrbit, zombie }`
- `functions/api/stats.test.ts` — unit tests for the stats query
- `src/pages/Home.tsx` — home page layout (hero/CTA left, stat cards right)
- `src/components/StatCard.tsx` — reusable stat card component
- `src/App.tsx` — add `/` route pointing to `Home`

**Tests this phase adds:**
- `/api/stats` returns correct shape `{ total: number, inOrbit: number, zombie: number }`
- `/api/stats` counts are non-zero after seeding

**Done-when:**
- [x] `schema.sql` reflects the upstream DB schema and `wrangler d1 execute` applies it without errors.
- [x] `scripts/seed.sh` imports the full 68k-row dataset into local D1.
- [x] `GET /api/stats` returns correct counts in `wrangler dev`.
- [x] Home page renders three stat cards with live numbers.
- [x] `npm test` passes.

**Session budget:** 1–2 sessions.

**Risks / unknowns:**
- D1 import of 68k rows: `wrangler d1 execute --file` works for SQL dumps but may need batching for large inserts. Investigate `wrangler d1 import` (available in newer Wrangler) as an alternative.
- The upstream `orbital_debris.db` schema may have SQLite-specific types or constraints that need minor adjustment for D1. Read `schema.sql` against the live file before writing migrations.

---

### Phase 2 — Objects table

**Goal:** Researcher can browse, search, filter, and sort all 68k objects in a paginated server-side table.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §4 stories 1 + 3, `docs/DESIGN.md` §2 (objects screen) + §3 (data table component) + §4, `schema.sql`, `functions/api/stats.ts` (for D1 query pattern).

**Files this phase creates/modifies:**
- `functions/api/objects/index.ts` — `GET /api/objects` with query params: `page`, `pageSize`, `search`, `sort`, `order`, `objectType`, `orbitClass`
- `functions/api/objects/index.test.ts` — API tests for pagination, search, filtering, sorting
- `src/pages/Objects.tsx` — objects page with table + search bar
- `src/components/DataTable.tsx` — custom server-side paginated table (plain `<table>` + Tailwind)
- `src/components/SearchBar.tsx` — Headless UI `Combobox` for name/NORAD ID search
- `src/components/Pagination.tsx` — page controls
- `src/hooks/useObjects.ts` — fetch hook wrapping `/api/objects`
- `src/App.tsx` — add `/objects` route

**Tests this phase adds:**
- Pagination returns correct page slice and total count
- Search by object name returns matching rows
- Search by NORAD ID returns exact match
- Sort by column (ascending + descending) returns correct order
- Filter by `objectType` returns only matching rows

**Done-when:**
- [x] `/api/objects` returns paginated results with correct `total`, `page`, `pageSize`, `data` shape.
- [x] Table renders 25 rows per page with working next/prev controls.
- [x] Searching by name or NORAD ID filters results server-side.
- [x] Clicking a column header sorts the table.
- [x] Clicking a row navigates to `/objects/:id` (stub page is acceptable).
- [x] `npm test` passes.

**Session budget:** 2+ sessions (this is the hardest phase).

**Risks / unknowns:**
- D1 full-text search is limited — `LIKE '%query%'` will work for small queries but may be slow at 68k rows. Index `name` and `norad_cat_id` columns.
- Filter parameter design (which columns are filterable, how to encode them in the URL) should be settled before writing the query — changing it mid-phase requires touching both API and UI.
- DataTable is built from scratch. Keep it simple (no virtual scrolling, no column resizing in v1).

---

### Phase 3 — Object detail page

**Goal:** Researcher can view a full profile for any object — identification, orbital parameters, ownership, launch data, and risk assessment — on a single page.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §4 story 2, `docs/DESIGN.md` §2 (detail screen) + §4, `schema.sql`, `functions/api/objects/index.ts` (for D1 query pattern).

**Files this phase creates/modifies:**
- `functions/api/objects/[id].ts` — `GET /api/objects/:id` returning all field groups via JOIN across relevant tables
- `functions/api/objects/[id].test.ts` — tests for found, not-found, and field completeness
- `src/pages/ObjectDetail.tsx` — detail page layout with field group sections
- `src/components/DetailSection.tsx` — reusable labeled field group (section header + key/value rows)
- `src/App.tsx` — add `/objects/:id` route

**Tests this phase adds:**
- `/api/objects/:id` returns full object with all field groups for a known NORAD ID
- `/api/objects/:id` returns 404 for an unknown ID
- All expected top-level keys present in response shape

**Done-when:**
- [x] `GET /api/objects/:id` returns identification, orbital params, ownership, launch, and risk fields.
- [x] Unknown ID returns `404 { error: "Not found" }`.
- [x] Detail page renders all field groups with monospace values for numeric/date fields.
- [x] Navigating back from detail page returns to the objects table.
- [x] `npm test` passes.

**Session budget:** 1 session.

**Risks / unknowns:**
- The detail query JOINs across up to 6 tables. Write it as a single JOIN query rather than N+1 fetches — D1 supports this and it avoids subrequest limits.
- Some objects may have null rows in optional tables (e.g. no UCS record). The API response shape must handle sparse data gracefully.

---

### Phase 4 — About page + nav polish

**Goal:** About page live, sidebar nav finalized for all routes, accessibility floor met, mobile drawer working.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §4 story 5, `docs/DESIGN.md` §2 (nav model) + §5 (a11y floor) + §6 (responsive strategy).

**Files this phase creates/modifies:** _(actuals, as implemented 2026-05-23)_
- `src/pages/About.tsx` — static about page (data sources, methodology, scope, project context)
- `src/components/Sidebar.tsx` — fixed 240px desktop sidebar, hidden below `md`
- `src/components/MobileDrawer.tsx` — Headless UI `Dialog` + top bar with hamburger, shown only below `md`; auto-closes on route change
- `src/components/NavLinks.tsx` — shared `NavLink` list used by both Sidebar and MobileDrawer; renders Home/Objects/About with Heroicons + active state
- `src/App.tsx` — replaced top-nav header with Sidebar + MobileDrawer layout; wired `/about` to `About` page; replaced placeholder route with a proper `NotFound`
- `src/components/DataTable.tsx` — keyboard activation (Enter/Space) and visible focus ring on clickable rows
- `src/components/Pagination.tsx` — explicit `focus-visible` outline on prev/next buttons
- `src/pages/Objects.tsx` — replaced "Phase 2" eyebrow with "Catalog"

**Tests this phase adds:**
- None — repo has no React component test harness (uses `@cloudflare/vitest-pool-workers` in workerd, not jsdom). Adding RTL + jsdom would be a new dependency; deferred. Manual smoke instead.

**Done-when:**
- [x] About page is reachable at `/about` and contains data source information.
- [x] Sidebar shows correct active link on all 4 routes.
- [x] At `md` breakpoint, sidebar collapses to a hamburger button that opens a drawer.
- [x] All inputs and interactive elements have visible focus states.
- [x] Color is never the only indicator of status (text label or icon accompanies color).
- [x] `npm test` passes (16/16).

**Session budget:** 1 session.

**Risks / unknowns:**
- Headless UI `Dialog` as a mobile drawer needs a focus trap and backdrop — test keyboard navigation before marking done.
- A11y audit at this phase may surface regressions in earlier components. Scope fixes to the a11y floor from DESIGN §5; don't expand scope.

---

### Phase 5 — Globe MVP (library + sampled render) — v2

**Goal:** A new `/globe` route renders a 3D Earth with a sampled subset (~1–5k) of orbits drawn as tilted ellipses from each object's SMA, eccentricity, and inclination. Camera controls work; perf is acceptable on a mid-range laptop. The visualization is honest: orientations (RAAN/argument of perigee) are randomized at render time and labeled as illustrative.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §5 (v2 orbit-shell scope) + §4 story 6, `docs/DESIGN.md` §2 (nav model — adding a 5th route) + §4 (tokens), `schema.sql` (orbital_data fields), `worker/routes/stats.ts` (D1 query pattern).

**Files this phase creates/modifies (expected):**
- `worker/routes/orbits.ts` — `GET /api/orbits?sample=N&seed=S` returning `{ orbits: [{ norad_id, sma_km, eccentricity, inclination_deg, orbit_class }] }`. Sampling is deterministic given a seed so reloads are stable.
- `worker/routes/orbits.test.ts` — shape + sample-size + determinism tests.
- `worker/index.ts` — dispatch `/api/orbits` to the new handler.
- `src/pages/Globe.tsx` — globe page (full-bleed canvas + a thin overlay panel for stats/legend).
- `src/components/OrbitGlobe.tsx` — globe.gl wrapper (or three.js scene if globe.gl can't render arbitrary 3D ellipses cleanly).
- `src/lib/orbitGeometry.ts` — pure function: orbital params → array of 3D points for one ellipse. Tested in isolation.
- `src/lib/orbitGeometry.test.ts` — unit tests for the geometry function (circle is a circle, eccentric is eccentric, inclined is inclined).
- `src/components/NavLinks.tsx` — add Globe entry.
- `src/App.tsx` — add `/globe` route.
- `package.json` — add `react-globe.gl` (or `three` + `@react-three/fiber` if we go raw).
- `src/pages/About.tsx` — add a short note: "globe orientations are illustrative; positions are not real-time."

**Tests this phase adds:**
- `/api/orbits?sample=100` returns 100 orbit records with required fields.
- `/api/orbits?sample=100&seed=X` returns the same 100 rows on repeat (deterministic sample).
- `orbitGeometry({ sma, e: 0, i: 0 })` returns points on a circle of radius `sma`.
- `orbitGeometry({ sma, e: 0.5, i: 0 })` returns an ellipse with the correct apogee/perigee ratio.
- `orbitGeometry({ sma, e: 0, i: 90 })` returns a polar orbit (z-axis spread).

**Done-when:**
- [x] `/api/orbits` returns a sampled, deterministic orbit dataset.
- [x] `/globe` route renders an Earth sphere + ~1–5k orbits at >30fps on a mid-range laptop.
- [x] Camera can rotate/zoom; orbits look visually plausible (low orbits hug Earth, GEO orbits sit far out, polar orbits are tilted ~90°).
- [x] About page labels orientations as illustrative.
- [x] `npm test` passes.

**Session budget:** 2 sessions. Library evaluation is the unknown — if globe.gl can't render arbitrary 3D ellipses cleanly, swap to `@react-three/fiber` in the same phase rather than fighting it.

**Risks / unknowns:**
- Library choice: `react-globe.gl` is the lean default, but its `customLayerData` API may not be ergonomic for arbitrary tilted ellipses. CesiumJS is the safer bet for orbit math but ~10MB bundle. Decide early — within the first hour — to avoid burning a session on the wrong library.
- Perf with 5k ellipses (each ~64 vertices) = 320k vertices. Should be fine, but instanced rendering may be needed by Phase 6 anyway; consider building for it from day 1.
- Honesty in labeling. The README + About + globe overlay must all be clear that this is "what orbits exist" not "where things are right now."

---

### Phase 6 — Globe at scale + integration — v2

**Goal:** Globe scales to the full 68k objects (or a clearly justified LOD scheme), filters from the existing app drive what's shown, and clicking an orbit navigates to `/objects/:id`.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §5 (v2 scope), `docs/DESIGN.md` §6 (responsive strategy), `worker/routes/orbits.ts`, `src/pages/Globe.tsx`, `src/components/OrbitGlobe.tsx`, `src/lib/orbitGeometry.ts`.

**Files this phase creates/modifies (expected):**
- `worker/routes/orbits.ts` — extend with `objectType`, `orbitClass`, `inOrbit`, `ownerCode` query params (mirror the Objects filter API surface).
- `src/components/OrbitGlobe.tsx` — switch to instanced rendering (one geometry, 68k instance transforms) or implement LOD (full set when stationary, decimated while orbiting).
- `src/components/GlobeFilters.tsx` — overlay panel with filter controls; same value semantics as Objects-page filters.
- `src/hooks/useOrbits.ts` — fetch + cache the orbit dataset; refetch on filter change.
- `src/components/OrbitGlobe.tsx` — raycaster/picking → `useNavigate('/objects/:id')` on click. Hover state surfaces a small chip with `object_name`.
- Mobile decision: either (a) render a smaller sample on mobile, (b) show a "globe is desktop-only" banner below `md`, or (c) implement a 2D fallback. Pick one in the phase; don't waffle.

**Tests this phase adds:**
- `/api/orbits?objectType=PAYLOAD&inOrbit=1` returns only matching rows.
- `useOrbits` hook returns the filtered dataset and invalidates correctly.
- Click handler resolves to the correct NORAD ID for a known orbit (unit-testable with a mock picker).

**Done-when:**
- [x] Globe renders the full filtered dataset (~34k candidate orbits, no LOD/sample cap on desktop) at >30fps via one instanced draw call.
- [x] Filter changes (objectType, orbitClass) update the visible orbits without a hard reload.
- [x] Clicking an orbit navigates to its detail page; hovering surfaces a name chip.
- [x] Mobile behavior matches the chosen strategy: render a reduced 1k sample below `md` (strategy "a").
- [x] `npm test` passes (48/48).

**Session budget:** 2 sessions. Scaling and picking are both genuinely hard.

**Risks / unknowns:**
- Picking 68k orbit lines with a raycaster is expensive. May need a "click goes to nearest hit within N pixels" approximation, or a separate hit-test mesh.
- If perf forces a library swap (globe.gl → three.js raw or CesiumJS), surface that early in the phase and let it eat a session; do not ship a janky 15fps globe.
- Filter UI must not duplicate Objects-page state — decide whether it's URL-synced (`/globe?objectType=...`), which is the v1 pattern, or local-only.

---

### Phase 7 — Globe filter expansion (identity, ownership, display cap) — v2

**Goal:** The globe is too cluttered with only type + orbit-class filters. Add the identity/ownership dimensions (name search, owner, operator country) plus a max-orbits display cap so a researcher can isolate what they care about.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §5, `worker/routes/orbits.ts`, `worker/routes/objects.ts` (search idiom), `src/components/GlobeFilters.tsx`, `src/pages/Globe.tsx`, `src/hooks/useOrbits.ts`, `schema.sql` (`ownership_operators`).

**Files this phase creates/modifies:** _(actuals, 2026-06-03)_
- `worker/routes/orbits.ts` — `LEFT JOIN ownership_operators`; add `search` (objects.ts idiom: digits → exact NORAD, else `UPPER(object_name) LIKE`) and `country` params. Raised `MAX_SAMPLE` 10000 → 40000 so the slider/desktop can truly request the full set.
- `worker/routes/orbitFacets.ts` — new `GET /api/orbits/facets` returning distinct `owners [{code,name}]` + `countries`, restricted to the candidate set, for the dropdowns (129 owners / 74 countries — too many to hardcode).
- `worker/index.ts` — dispatch `/api/orbits/facets` before bare `/api/orbits`.
- `src/hooks/useOrbits.ts` — `OrbitsQuery` gains `search`/`ownerCode`/`country`; added `useOrbitFacets()` hook.
- `src/components/GlobeFilters.tsx` — debounced search input, owner + country dropdowns (from facets), max-orbits slider, Reset button.
- `src/pages/Globe.tsx` — single `GlobeFilterValues` state; effective `sample` clamped per breakpoint (desktop max 40000, mobile 2000); scrollable overlay.

**Tests added:** API `search` (numeric + name) + `country` filters; `/api/orbits/facets` (distinct, sorted, candidate-restricted); `buildOrbitsQuery` new params. 55/55 passing.

**Done-when:**
- [x] Name search, owner, and country filters narrow the globe; dropdowns list only values present in the candidate set.
- [x] Max-orbits slider limits the rendered count; "Showing N of M" reflects it.
- [x] Filters combine (AND) + Reset clears them; no hard reload, camera persists.
- [x] `npm test`, `npm run typecheck`, `npm run build` pass.

**Session budget:** 1 session.

---

### Phase 8 — Globe geometric & temporal range filters — v2

**Goal:** Round out the "other criteria" filters with orbital geometry and launch time.

**Context to load:** `CLAUDE.md`, `worker/routes/orbits.ts`, `worker/routes/orbitFacets.ts`, `src/components/GlobeFilters.tsx`, `src/pages/Globe.tsx`, `src/hooks/useOrbits.ts`, `schema.sql` (`orbital_data` perigee/apogee, `launch_events`).

**Files this phase creates/modifies:** _(actuals, 2026-06-04)_
- `worker/routes/orbits.ts` — `LEFT JOIN launch_events`; `minAltKm`/`maxAltKm` (altitude **containment**: `perigee_km >= min AND apogee_km <= max`), `minInc`/`maxInc`, `minYear`/`maxYear` params + `parseFiniteNumber` + an `addRange` helper.
- `worker/routes/orbitFacets.ts` — added a `bounds` block (`altitudeKm`/`inclinationDeg`/`launchYear` min+max over the candidate set) for the number-input placeholders.
- `src/hooks/useOrbits.ts` — six range strings on `OrbitsQuery`; `OrbitFacets` gains `bounds`/`RangeBound`/`OrbitBounds`.
- `src/components/GlobeFilters.tsx` — internal `RangeInputs` (debounced min/max number boxes, placeholders from bounds) reused 3×; Reset/hasActiveFilters extended.
- `src/pages/Globe.tsx` — six fields added to `EMPTY_FILTERS`.

**Decisions:** UI is **paired min/max number inputs**, not sliders — dependency-free, accessible, and immune to altitude's 5 km–1.37M km span. Bounds come from `/api/orbits/facets`. Altitude uses **containment** (whole orbit within the band: `perigee >= min AND apogee <= max`) — initially shipped as overlap, corrected 2026-06-04 because a transfer orbit dipping into the band at perigee was surprising.

**Tests added:** API altitude (min/max/band-overlap), inclination, launch-year filters; facet `bounds` (candidate-restricted); `buildOrbitsQuery` range params. 63/63 passing.

**Done-when:**
- [x] Altitude, inclination, and launch-year ranges narrow the globe; empty box = unbounded on that side.
- [x] Ranges combine (AND) with Phase 7 filters; Reset clears them; no hard reload.
- [x] `npm test`, `npm run typecheck`, `npm run build` pass.

**Session budget:** 1 session.

---

### Phase 9 — Unified filters across Objects + Globe (+ zombie & in_orbit) — v2

**Goal:** The Objects table and the Globe had drifted (table had 3 filters, globe had 8). Give both pages the *same* filter surface from shared code, and add two new dimensions: **zombie** (`risk_assessment.is_zombie`) and **in_orbit** (`satellites.in_orbit`).

**Context to load:** `CLAUDE.md`, `worker/routes/{objects,orbits}.ts`, `worker/lib/`, `src/pages/{Objects,Globe}.tsx`, `src/components/GlobeFilters.tsx`, `src/hooks/use{Objects,Orbits,Facets}.ts`, `schema.sql`.

**Files this phase creates/modifies:** _(actuals, 2026-06-04)_
- `worker/lib/filters.ts` (new) — `applyCommonFilters(params) → { clauses, bindings, needs }`; one predicate builder for search/objectType/orbitClass/ownerCode/country/altitude(containment)/inclination/launchYear/isZombie/inOrbit, used by both routes. `parseFiniteNumber`/`addRange` live here.
- `worker/lib/facets.ts` (new) — `getFacets(env, baseWhere)`; `orbitFacets.ts` is now a thin wrapper (candidate scope) + new `objectFacets.ts` (all-objects scope) dispatched at `/api/objects/facets`.
- `worker/routes/orbits.ts`, `worker/routes/objects.ts` — call `applyCommonFilters`; objects adds the ownership/launch/risk LEFT JOINs + `is_zombie` in the response; in_orbit default = all (objects) vs 1 (orbits).
- `src/lib/filterParams.ts` (new) — `CommonFilters` type + `appendFilterParams` + `countActiveFilters`, used by both `buildQueryString` and `buildOrbitsQuery`.
- `src/components/filters/` (new) — `RangeInputs` (extracted), `FacetSelect`, `TristateSelect`, shared `fieldStyles`.
- `src/hooks/useFacets.ts` (new) — generalizes the old `useOrbitFacets` to `useFacets(endpoint)`.
- `src/pages/Objects.tsx` — always-visible search/type/orbit + a Headless UI `Disclosure` "More filters" (owner, country, ranges, in_orbit, zombie) with active-count badge + Reset; new "Zombie" column.
- `src/components/GlobeFilters.tsx` + `src/pages/Globe.tsx` — switched to the shared controls; added zombie + in_orbit (`'all'` sentinel for the globe, which otherwise defaults to in-orbit).

**Tests added:** objects API (owner/country/altitude/inclination/year/isZombie/inOrbit/combined), `objectFacets` (all-objects scope incl. decayed-only owners), orbits `isZombie`, `filterParams`. 77/77 passing.

**Done-when:**
- [x] Objects table exposes the full filter set + zombie + in_orbit behind a disclosure; globe gains zombie + in_orbit.
- [x] One backend filter builder + one set of frontend controls drive both pages (no duplication).
- [x] `npm test`, `npm run typecheck`, `npm run build` pass.

**Session budget:** ~2 sessions.

---

## Decision log

| Date | Phase touched | Change | Reason |
|---|---|---|---|
| 2026-05-13 | All | Initial plan | PRD + design brief complete; no code exists yet |
| 2026-05-14 | All | Translate file layout from Pages Functions → Workers + Static Assets | Repo was bootstrapped with `npm create cloudflare@latest`, which now uses the Workers model. Same architectural outcome; only paths differ. |
| 2026-05-14 | Phase 0 | Use Tailwind v4 CSS-first config (`@theme` in `index.css`) instead of `tailwind.config.ts` | Tailwind v4 dropped the JS config file as the default; CSS-first is the supported path. |
| 2026-05-20 | Phase 1 | Per-route handler files under `worker/routes/` (e.g. `worker/routes/stats.ts`) instead of inlining handlers in `worker/index.ts` | Keeps the Worker entrypoint thin and makes each route trivially testable in isolation; sets the pattern for Phases 2–3. |
| 2026-05-20 | Phase 1 | Seed script uses `sqlite3 .dump \| grep ^INSERT` piped to `wrangler d1 execute --file` | Simplest robust path — schema is applied separately from `schema.sql`, so we keep only the INSERT rows from the upstream dump. Imports 69,020 rows in under a minute on local D1. |
| 2026-05-22 | Phase 2 | `/api/objects` is a single route file (`worker/routes/objects.ts`) using a `LEFT JOIN orbital_data` rather than separate endpoints per filter | Both the orbit-class filter and the orbit-class column need that table; one join handler is simpler than two endpoints and keeps the per-route file pattern from Phase 1. |
| 2026-05-22 | Phase 2 | Search treats all-digit input as exact `norad_id =` match and non-numeric input as case-insensitive `UPPER(object_name) LIKE %term%` | NORAD IDs are integers; an integer-typed search needs an exact predicate or it returns nothing. `UPPER(...) LIKE` avoids relying on D1 collation behavior. Sort whitelist (`SORTABLE_COLUMNS`) blocks SQL injection on the `sort` param. |
| 2026-05-23 | Phase 4 | Sidebar + MobileDrawer share a `NavLinks.tsx` component instead of duplicating the link list | Headless UI `Dialog` for mobile and a fixed `<aside>` for desktop are structurally different, but the nav items, active-state, and a11y semantics should not drift. One source of truth keeps them in sync. |
| 2026-05-23 | Phase 4 | Skipped React component tests; relied on typecheck + build + manual smoke | Repo's vitest pool is `@cloudflare/vitest-pool-workers` (workerd, no DOM). Adding `@testing-library/react` + `jsdom` is a real dependency decision, not a Phase 4 sub-task. Phases 1-3 set the same precedent. |
| 2026-05-23 | Phase 5/6 (v2) | v2 globe will render **orbit shells** (tilted ellipses from SMA + e + inclination), not real-time positions | The dataset has no RAAN, argument of perigee, mean anomaly, or epoch — there is no way to compute where any object is right now. Real-time positions would require ingesting TLEs from Space-Track/Celestrak, which is an upstream pipeline change and a daily-refresh story. Defer that to a hypothetical v3; v2 honest-labels orientations as illustrative. |
| 2026-05-23 | Phase 5 (v2) | Default library: `react-globe.gl`; fall back to `@react-three/fiber` if it can't render arbitrary 3D ellipses cleanly | globe.gl is the smallest viable dep and gives us a working Earth + camera + atmosphere for free. CesiumJS is the safer-for-orbit-math choice but ~10MB and locks us to its scene model; deferred unless forced. |
| 2026-06-03 | Phase 6 (v2) | Render all ~34k orbits as one `THREE.InstancedMesh` (thin elliptical-torus base + per-orbit affine matrix), not per-`Line` objects | A Keplerian ellipse is an affine transform of a unit circle, so each orbit is one instance matrix and the whole set is a single draw call — Phase 5's per-`Line` approach was ~34k draw calls. The perifocal rotation matrix is shared with `orbitGeometry` via a new pure `orbitRotation` helper (one source of truth). |
| 2026-06-03 | Phase 6 (v2) | Pick orbits with our own `THREE.Raycaster` reading `instanceId`, not globe.gl's `onCustomLayer*` events | globe.gl's custom-layer events report the datum, not the `instanceId`, so they can't distinguish individual orbits inside one InstancedMesh. We raycast the mesh on the globe's canvas/camera (hover throttled via rAF). `instanceId → norad_id` is a pure, unit-tested index lookup (`orbitPicking.ts`). |
| 2026-06-03 | Phase 6 (v2) | Mobile (`< md`) renders a reduced 1k sample, not a desktop-only banner or 2D fallback | Keeps the globe usable on phones without asking a mobile GPU to draw ~34k instances. Matches PRD §5 "mobile should not break but is not optimized." Added `object_name` to `/api/orbits` for the hover chip; filter state is local (not URL-synced), mirroring the Objects page. |
| 2026-06-03 | Phase 7 (v2) | Owner/country dropdowns are populated from a new `/api/orbits/facets` endpoint, not hardcoded | 129 distinct owners + 74 countries is far too many to hardcode (the Objects page hardcodes only ~5 types/classes). Facets are restricted to the candidate set so a dropdown never offers a value that returns nothing. Non-cascading (owner choice doesn't shrink the country list) to keep it simple. |
| 2026-06-03 | Phase 7 (v2) | Expose the existing `sample` param as a "max orbits" slider; raise `MAX_SAMPLE` 10000 → 40000 | Phase 6 claimed the globe rendered the full ~34k but the server silently clamped to 10k — raising the cap makes that true and gives the declutter slider real range. The deterministic sample means lowering the cap shows a stable representative subset. `owner_code` and "owner" are one dimension (code vs. display name) — a single dropdown filtering by `ownerCode`. |
| 2026-06-04 | Phase 8 (v2) | Range filters use paired min/max **number inputs**, not sliders | HTML has no native dual-thumb range, and altitude spans 5 km–1.37M km, which mis-scales any linear slider. Number inputs are dependency-free, accessible, and let the user type exact values; range bounds from `/api/orbits/facets` are shown as placeholders. |
| 2026-06-04 | Phase 8 (v2) | Altitude band corrected from **overlap** to **containment** (`perigee >= min AND apogee <= max`) | Overlap (`apogee >= min AND perigee <= max`) let high-eccentricity transfer orbits through when they only dipped into the band at perigee (e.g. a 488 km perigee / 23,377 km apogee orbit showing up in a 300–500 km filter). Containment matches the intuitive "orbit lives in this band" reading. |
| 2026-06-04 | Phase 9 (v2) | Extract one shared filter builder (`worker/lib/filters.ts`) + shared frontend controls (`src/components/filters/`, `src/lib/filterParams.ts`) instead of duplicating filters per page | The table and globe had already drifted (3 vs 8 filters). A single predicate builder + a single `CommonFilters` type + shared controls means a new filter is added once and both pages get it — the structural fix for the drift, not just a one-time catch-up. |
| 2026-06-04 | Phase 9 (v2) | `in_orbit` default differs by page: objects = all (`''` omits the param), globe = in-orbit (`'1'`), with an explicit `'all'` sentinel for the globe | The globe is about orbits that *currently exist*, so in-orbit is its sensible default; the table is a full catalog browser, so "all" is its default. The orbits API treats an absent `inOrbit` as in-orbit-only, so the globe needs a sentinel to request everything. |
| 2026-06-04 | Phase 9 (v2) | Facets are scoped per page via `getFacets(env, baseWhere)`: globe = candidate set, objects = all objects | 129 owners / 74 countries app-wide vs 106 / 71 in-orbit. The table's dropdowns must cover owners/countries that exist only on decayed objects; the globe's must not offer values that would render nothing. |

---

## Handoff notes

The project is "done" when:

- Public Cloudflare Pages URL is deployed and linked from `README.md`.
- All Must-have user stories from `docs/PRD.md` §4 have green tests.
- A researcher can find any object by name or NORAD ID and view its full detail in under 30 seconds (manual smoke test).
- Architecture diagram regenerated and committed.
- Demo video and PRD video linked from `README.md`.
