# Design Brief

_This file is the source of truth for UI/UX decisions on this project. Updated via the `design-brief` skill. A compass, not a spec — five real decisions beat fifty hypothetical ones._

> **Status:** Draft
> **Last updated:** 2026-05-10

---

## 1. Visual identity

**Mood:** Dark, technical, data-dense.

**Reference:** The existing [orbital-debris-interactive.vercel.app](https://orbital-debris-interactive.vercel.app) site. Carry the same aesthetic forward — navy/black backgrounds, cyan data highlights, gold CTAs, monospace for values.

**Anti-references:** Marketing sites, light themes, anything that feels "consumer" rather than "instrument."

**Brand constraints:** None — no logo, no stakeholder color requirements.

---

## 2. Information architecture

**Primary screens:**
- `/` — Home: hero/CTA on the left, summary stats on the right (total objects, in-orbit count, zombie count)
- `/objects` — Objects table: filterable, sortable, paginated; search by name or NORAD ID
- `/objects/:id` — Detail view: full object profile (identification, orbital params, ownership, launch, risk)
- `/about` — About: data sources, methodology, project context

**Navigation model:** Fixed sidebar (240px) on desktop. Collapses to a mobile drawer on small screens. Sidebar is preferred over top nav because the app will expand in v2 and the sidebar can accommodate quick-view panels later.

**The hero screen:** `/objects` — if a researcher only ever lands on one screen, it should be the table. The home page sets context; the table is where the work happens.

---

## 3. Component approach

- **Framework:** React (Vite)
- **Component library:** [Headless UI](https://headlessui.com/) for accessible primitives — use `Combobox` for the object search, `Dialog` for any modals, `Disclosure` for collapsible sidebar sections.
- **Styling:** Tailwind CSS
- **Icons:** Heroicons (same team as Tailwind/Headless UI)
- **Custom components needed:**
  - Data table with server-side pagination, sorting, and filtering (Headless UI does not provide this — build from scratch using `<table>` + Tailwind)
  - Stat cards (simple — build from scratch)
  - Sidebar nav with active link state

---

## 4. Visual tokens

**Colors:**

| Token | Value | Usage |
|---|---|---|
| Background | `#0f172a` | Page background |
| Surface | `#1e293b` | Cards, sidebar, panels |
| Border | `#334155` | Subtle dividers |
| Text primary | `#f8fafc` | Headings, body |
| Text secondary | `#94a3b8` | Labels, muted info |
| Text tertiary | `#64748b` | Placeholder, disabled |
| Accent gold | `#fbbf24` | Primary CTA buttons |
| Accent gold hover | `#f59e0b` | Button hover state |
| Accent cyan | `#38bdf8` | Data values, metric highlights, status indicators |
| Success | `#22c55e` | Operational status |
| Danger | `#ef4444` | Zombie / degraded status |
| Warning | `#f59e0b` | Caution states |

**Typography:**
- **Body:** `system-ui, "Segoe UI", Roboto, sans-serif` — no Google Font load
- **Data / values:** `ui-monospace, Consolas, monospace` — all NORAD IDs, numeric orbital values, dates
- **Label style:** Uppercase, `text-xs`, `tracking-widest` for section headers and column labels

**Spacing:** Tailwind defaults.

**Border radius:** `rounded-lg` (`0.5rem`) everywhere — cards, inputs, buttons. Consistent, not pill, not sharp.

**Shadow:** `shadow-lg` on cards only. No shadow on buttons or inputs.

**Animations:** None in v1. No hover transforms, no transitions. Add back in a later polish pass.

---

## 5. Accessibility floor

- Keyboard-navigable end-to-end (Headless UI handles this for Dialog, Combobox, etc.)
- WCAG AA contrast on all text against their backgrounds
- All form inputs have visible labels — no placeholder-as-label
- Focus states are visible — do not remove `outline` without a visible replacement
- Color is never the only way to convey status — pair color with a text label or icon

---

## 6. Responsive strategy

- **Smallest target:** Desktop-first. Mobile should not break but is not optimized in v1.
- **Breakpoint:** `md` (768px) — sidebar collapses to a hamburger drawer below this.
- **What changes at `md`:**
  - Sidebar → fixed drawer with backdrop overlay
  - Multi-column stat cards → single column stack
  - Table → horizontal scroll (do not collapse to cards in v1)

---

## 7. Risks & unknowns

- **Data table complexity:** 68k rows with server-side sort + filter + pagination is the hardest UI component. Build this first — everything else is simpler by comparison.
- **Sidebar quick-views:** The existing site hints at panel-style quick views in the sidebar. Architecture should leave room for this in v2 (avoid hardcoding sidebar width or making it purely decorative).

---

## 8. Out of scope (for v1)

- Animations and hover transforms — deferred to a polish pass
- Dark/light mode toggle — dark only in v1
- Custom logo or illustration system
- Mobile-optimized table (cards view) — horizontal scroll is acceptable in v1
- 3D globe — v2
