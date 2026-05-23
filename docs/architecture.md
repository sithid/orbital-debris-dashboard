# Architecture

_Last regenerated: 2026-05-23 (end of Phase 4, post-smoke-test refresh). Regenerate at the end of each phase or when the request flow changes — if this no longer matches the code, something drifted and is worth a 10-minute review._

## Diagram

```mermaid
flowchart TD
    User[Researcher<br/>browser]

    subgraph SPA[React SPA - BrowserRouter]
      Shell[App.tsx Shell<br/>Sidebar + MobileDrawer]
      RHome[/ Home.tsx/]
      RObjects[/objects Objects.tsx/]
      RDetail[/objects/:id ObjectDetail.tsx/]
      RAbout[/about About.tsx/]
      R404[* NotFound]
      Shell --> RHome
      Shell --> RObjects
      Shell --> RDetail
      Shell --> RAbout
      Shell --> R404
    end

    subgraph CF[Cloudflare edge - single Worker]
      Worker[worker/index.ts<br/>fetch handler<br/>CORS + OPTIONS preflight]
      Assets[(ASSETS binding<br/>not_found_handling:<br/>single-page-application)]
      D1[(D1: orbital-debris<br/>6 tables, ~68k rows)]

      subgraph Routes[worker/routes / inline]
        Health[/api/health<br/>inline in index.ts]
        Stats[stats.ts<br/>getStats]
        Objects[objects.ts<br/>getObjects<br/>bad sort → 400]
        Object[object.ts<br/>6-table LEFT JOIN<br/>NaN id → 400<br/>not found → 404]
        Unknown[unknown /api/* → 404 JSON]
      end
    end

    User -->|HTML/JS/CSS<br/>+ SPA fallback for unknown paths| Assets
    Assets -.->|hydrates| SPA

    RHome -->|GET /api/stats| Worker
    RObjects -->|GET /api/objects?...| Worker
    RDetail -->|GET /api/objects/:id| Worker
    RAbout -. no API call .- Worker

    Worker --> Health
    Worker --> Stats
    Worker --> Objects
    Worker --> Object
    Worker --> Unknown
    Worker -->|non-api path| Assets
    Stats -->|env.DB.prepare| D1
    Objects -->|env.DB.prepare| D1
    Object -->|env.DB.prepare| D1

    Seed[scripts/seed.sh<br/>local-only<br/>wrangler d1 execute] -.->|one-time local seed| D1
```

## How it works

One Worker entrypoint, one D1 binding, one static-assets binding with SPA fallback. The Worker's `fetch` handler is a flat dispatcher: it short-circuits `OPTIONS /api/*` for CORS preflight, then matches pathnames into route handlers — `/api/health` inlined, the other three under `worker/routes/*.ts`. Each handler queries D1 via `env.DB.prepare`. Unknown `/api/*` paths return a 404 JSON envelope; anything outside `/api/*` is explicitly delegated to `env.ASSETS.fetch(request)`, which serves the React build and rewrites unknown paths to `index.html` so client-side routes like `/objects/25544` and `/about` resolve into the SPA. The SPA's `App.tsx` shell wraps every route in `Sidebar` + `MobileDrawer` (Headless UI `Dialog` below the `md` breakpoint) and uses a `*` route to catch client-side 404s. Three pages call back to the Worker for live data; About is fully static. Error paths are minimal but real: `objects.ts` raises `ObjectsQueryError` on a bad `sort` whitelist hit (400), and the detail route returns 400 for non-numeric IDs and 404 for missing ones. Data flows one way: read-only from D1 → JSON → React state.

## Decisions that shaped this

1. **One Worker for API and static assets, not Pages Functions.** The project was bootstrapped on Cloudflare's Workers + Static Assets template (see BUILDPLAN decision log entry 2026-05-14). The Worker is the single entrypoint; the `assets` binding serves the React build. We pay the cost of hand-rolled routing (`if`/regex in `worker/index.ts`) in exchange for one deploy artifact, one set of bindings, and a transparent request path with no framework router in front of it.

2. **Per-route handler files instead of inlining handlers in `worker/index.ts`.** Decided in Phase 1 (decision log 2026-05-20). The entrypoint stays a thin dispatcher; each route's logic lives in `worker/routes/*.ts` and is independently testable via `@cloudflare/vitest-pool-workers` with `SELF.fetch()`.

3. **The object detail endpoint is a single 6-table `LEFT JOIN`, not N+1 fetches.** Decided in Phase 3. One query keeps us inside D1's subrequest budget and lets sparse data (objects missing UCS or launch rows) come back as nulls instead of dropping the satellite. The shared tables (`ownership_operators`, `launch_events`) are joined via string foreign keys on `satellites`, not by `norad_id`, because they're 1-to-many — many satellites share one owner or one launch.

4. **Layout shell (`Sidebar` + `MobileDrawer`) sits inside the SPA, not on the server.** Decided in Phase 4. Nav is pure client-side state, so there's no value in server-rendering it; keeping the shell in `App.tsx` lets `NavLink` drive active state from React Router with no round-trip. `Sidebar` and `MobileDrawer` share their link list via `components/NavLinks.tsx` to prevent drift.
