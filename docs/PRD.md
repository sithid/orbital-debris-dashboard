# Product Requirements Document (PRD)

> **Status:** Draft
> **Last updated:** 2026-05-10
> **Author:** sithid
> **Stakeholder:** General public, researchers, space enthusiasts

---

## 1. The problem

Researchers, students, and space enthusiasts who want to explore orbital debris data are stuck using raw tables on Space-Track.org or Celestrak. There is no visual, interactive way to find a specific satellite or debris object and understand its full profile — identification, orbit, ownership, and risk — in one place. The maintainer (the developer) has built a merged SATCAT + UCS data pipeline that answers these questions via SQL queries, but there is no UI for anyone else to explore it. The goal is to expose that data through a public dashboard so any researcher can find and explore any object in under 30 seconds.

---

## 2. The user

- **Primary user:** Researchers — people actively studying orbital debris, space traffic, or satellite operations who currently use Space-Track.org or Celestrak as their primary data source.
- **Secondary users:** Students and space enthusiasts who want to explore orbital crowding.
- **Their current workflow:** Visit Space-Track.org or Celestrak, navigate raw tables, manually look up objects. No visual context, no combined SATCAT + UCS data in one view.
- **Their technical comfort:** Comfortable with web apps and data tables. Familiar with NORAD IDs and orbital terminology.
- **What device will they use it on?** Desktop (primary use case is research, not mobile browsing).

---

## 3. What success looks like

- **Must-have outcome:** A researcher can find any satellite or debris object by name or NORAD ID and view its full detail profile in under 30 seconds.
- **Nice-to-have outcome:** Summary stats on the home page give a researcher immediate situational awareness (total objects, in-orbit count, zombie count) without needing to dig.
- **Kill condition:** If nobody uses the dashboard after it is shared publicly, the project is not worth continuing.
- **Not a goal:** This is not a real-time tracking tool. It is not a full analysis platform. It does not replace Space-Track.org.

---

## 4. Core user stories

1. **[Must]** As a researcher, I want to search for a satellite or debris object by name or NORAD ID so that I can quickly find the object I'm investigating.
2. **[Must]** As a researcher, I want to view a full detail page for any object (identification, orbital parameters, ownership, launch data, risk assessment) so that I have everything I need in one place.
3. **[Must]** As a researcher, I want to browse a filterable, sortable, paginated table of all objects so that I can explore the dataset without knowing a specific object in advance.
4. **[Must]** As a visitor, I want to see summary stats on the home page (total objects, in-orbit count, zombie count) so that I immediately understand the scale of the problem.
5. **[Should]** As a visitor, I want to read an About page that explains the data sources and methodology so that I can trust the data.
6. **[Won't — this release]** 3D globe visualization of orbital crowding — moved to v2.
7. **[Won't — this release]** User accounts, data export, real-time updates, alerts.

---

## 5. Out of scope

- **3D globe** — the most-wanted feature, explicitly deferred to v2.
- **User accounts / authentication** — v1 is fully public and read-only.
- **Data export** — no CSV or API download in v1.
- **Live data updates** — v1 uses a static snapshot of the SATCAT + UCS merged dataset.
- **Comparison tools** — no side-by-side object comparison in v1.
- **Mobile-first design** — desktop is the primary target; mobile should not break but is not optimized.

---

## 6. Technical shape

- **Type of app:** Full-stack web app (React frontend + serverless API + managed database)
- **Does it need to store data?** Yes — structured records. 68,727 total objects across 6 relational tables (satellites, orbital_data, risk_assessment, launch_events, ownership_operators, ucs_details).
- **Does it need authentication?** No — fully public, read-only.
- **Does it need to call external services?** No — all data comes from the local D1 database seeded from the existing pipeline.
- **Who pays for hosting?** Developer — Cloudflare free tier covers this comfortably for v1 traffic.

### Proposed Cloudflare stack

| Need | CF Product | Why |
|---|---|---|
| Hosting the web UI | **Pages** | Deploys static React/Vite apps globally; generous free tier; zero config for static assets |
| Backend API / DB queries | **Pages Functions** | Serverless Workers built into Pages — no separate deployment needed for API routes |
| Structured data | **D1** | Managed SQLite; existing `orbital_debris.db` can be imported directly; SQL queries for filtering/pagination over 68k rows |

---

## 7. Risks and unknowns

- **Biggest risk:** No validated user demand yet — the developer has not confirmed with a real researcher that this solves their problem. Recommend sharing the PRD with one researcher before writing code.
- **TypeScript familiarity:** Developer knows JavaScript and OOP but is new to TypeScript specifically. Expect some friction with type annotations early on; not a blocker.
- **Table performance:** 68k rows requires server-side pagination and filtering via D1 queries. A naive client-side approach will fail. This must be designed correctly from the start.
- **Things I'm assuming but haven't verified:** That the existing `orbital_debris.db` schema maps cleanly into D1 without migration issues.

---

## 8. Milestones

- **Week 2 end:** Home page deployed on Cloudflare Pages. Hero/CTA layout on the left, summary stats (total objects, in-orbit count, zombie count) on the right, pulled live from D1. D1 seeded with the full dataset.
- **Week 3 end:** Objects page live — filterable, sortable, paginated table of all 68k objects. Search by name or NORAD ID working. Clicking a row navigates to the detail page (stub is fine).
- **Week 4 demo:** Full individual object detail page with all fields (identification, orbital data, ownership, launch info, risk assessment). About page complete. A researcher can find and explore any object in under 30 seconds.
