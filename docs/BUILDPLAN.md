# Build Plan

_This file is the phased build plan for the project. It's the bridge between `docs/PRD.md` (what to build) + `docs/DESIGN.md` (what it looks like) and the actual code. Re-run the `build-plan` skill whenever reality has diverged from the plan._

> **Status:** In Progress
> **Last updated:** 2026-05-13
> **Current phase:** Phase 0

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

**Files this phase creates/modifies:**
- `package.json` — dependencies (React, Vite, TypeScript, Tailwind, Headless UI, Heroicons, Vitest, @cloudflare/vitest-pool-workers)
- `vite.config.ts` — Vite config with React plugin
- `tsconfig.json` — strict TypeScript config
- `wrangler.toml` — Pages + D1 binding declaration
- `tailwind.config.ts` — Tailwind config with custom tokens from DESIGN §4
- `src/main.tsx` — React entry point
- `src/App.tsx` — root component with placeholder routes
- `functions/api/_middleware.ts` — base API middleware (CORS headers)
- `vitest.config.ts` — Vitest config with `@cloudflare/vitest-pool-workers`
- `functions/api/health.ts` — smoke-test endpoint returning `{ ok: true }`
- `functions/api/health.test.ts` — smoke test

**Tests this phase adds:**
- `health endpoint returns 200 with { ok: true }`

**Done-when:**
- [ ] `npm test` passes.
- [ ] `wrangler dev` starts without errors and `GET /api/health` returns `{ ok: true }`.
- [ ] `wrangler deploy` produces a public Cloudflare Pages URL.
- [ ] Public URL is committed to `README.md`.

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
- [ ] `schema.sql` reflects the upstream DB schema and `wrangler d1 execute` applies it without errors.
- [ ] `scripts/seed.sh` imports the full 68k-row dataset into local D1.
- [ ] `GET /api/stats` returns correct counts in `wrangler dev`.
- [ ] Home page renders three stat cards with live numbers.
- [ ] `npm test` passes.

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
- [ ] `/api/objects` returns paginated results with correct `total`, `page`, `pageSize`, `data` shape.
- [ ] Table renders 25 rows per page with working next/prev controls.
- [ ] Searching by name or NORAD ID filters results server-side.
- [ ] Clicking a column header sorts the table.
- [ ] Clicking a row navigates to `/objects/:id` (stub page is acceptable).
- [ ] `npm test` passes.

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
- [ ] `GET /api/objects/:id` returns identification, orbital params, ownership, launch, and risk fields.
- [ ] Unknown ID returns `404 { error: "Not found" }`.
- [ ] Detail page renders all field groups with monospace values for numeric/date fields.
- [ ] Navigating back from detail page returns to the objects table.
- [ ] `npm test` passes.

**Session budget:** 1 session.

**Risks / unknowns:**
- The detail query JOINs across up to 6 tables. Write it as a single JOIN query rather than N+1 fetches — D1 supports this and it avoids subrequest limits.
- Some objects may have null rows in optional tables (e.g. no UCS record). The API response shape must handle sparse data gracefully.

---

### Phase 4 — About page + nav polish

**Goal:** About page live, sidebar nav finalized for all routes, accessibility floor met, mobile drawer working.

**Context to load:** `CLAUDE.md`, `docs/PRD.md` §4 story 5, `docs/DESIGN.md` §2 (nav model) + §5 (a11y floor) + §6 (responsive strategy).

**Files this phase creates/modifies:**
- `src/pages/About.tsx` — static about page (data sources, methodology, project context)
- `src/components/Sidebar.tsx` — finalized nav with active link state for all 4 routes
- `src/components/MobileDrawer.tsx` — Headless UI `Dialog` used as mobile nav drawer
- `src/App.tsx` — wire About route, wrap layout with Sidebar
- Any a11y fixes surfaced during testing (focus states, contrast, label coverage)

**Tests this phase adds:**
- About page renders without errors
- Sidebar shows active state on current route
- Mobile drawer opens and closes (if testable in Vitest; otherwise manual)

**Done-when:**
- [ ] About page is reachable at `/about` and contains data source information.
- [ ] Sidebar shows correct active link on all 4 routes.
- [ ] At `md` breakpoint, sidebar collapses to a hamburger button that opens a drawer.
- [ ] All inputs and interactive elements have visible focus states.
- [ ] Color is never the only indicator of status (text label or icon accompanies color).
- [ ] `npm test` passes.

**Session budget:** 1 session.

**Risks / unknowns:**
- Headless UI `Dialog` as a mobile drawer needs a focus trap and backdrop — test keyboard navigation before marking done.
- A11y audit at this phase may surface regressions in earlier components. Scope fixes to the a11y floor from DESIGN §5; don't expand scope.

---

## Decision log

| Date | Phase touched | Change | Reason |
|---|---|---|---|
| 2026-05-13 | All | Initial plan | PRD + design brief complete; no code exists yet |

---

## Handoff notes

The project is "done" when:

- Public Cloudflare Pages URL is deployed and linked from `README.md`.
- All Must-have user stories from `docs/PRD.md` §4 have green tests.
- A researcher can find any object by name or NORAD ID and view its full detail in under 30 seconds (manual smoke test).
- Architecture diagram regenerated and committed.
- Demo video and PRD video linked from `README.md`.
