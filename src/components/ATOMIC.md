# Component tiers (Atomic Design)

This project follows Brad Frost's Atomic Design
(https://atomicdesign.bradfrost.com/chapter-2). Components live under
`src/components/<tier>/`; routed views live in `src/pages/`.

## atoms/
The smallest building blocks — token-styled primitives, no app knowledge.
- `Button` (+ `buttonClasses` for `<Link>`s), `TextInput`, `Select`, `Badge`,
  `Eyebrow`, `Card`, and `field.ts` (shared input/select base classes).

## molecules/
Small groups of atoms with a single job.
- `SearchBar`, `Pagination`, `StatCard`, `NavLinks`, `DetailSection`,
  `RangeInputs`, `FacetSelect`, `TristateSelect`, `Legend`,
  `IllustrativeNotice`, `HoverChip`, `GlobeStatsPanel`.

## organisms/
Larger, self-contained sections composed of molecules + atoms.
- `DataTable`, `GlobeFilters`, `GlobeOverlay`, `ObjectsToolbar`, `Sidebar`,
  `MobileDrawer`, `OrbitGlobe`.

## templates/
Page-level layout skeletons (no real data).
- `DashboardLayout` (sidebar + mobile drawer + main content column).

## pages/ (`src/pages/`)
Templates filled with real data + routing: `Home`, `Objects`, `ObjectDetail`,
`Globe`, `About`, `NotFound`.

## Conventions
- An atom/molecule is extracted only when reused (≥2 call sites) or when it
  removes a meaningful repeated class-string. One-off markup stays inline.
- Variants are plain Tailwind token classes (see `index.css` `@theme`); no
  variant library.
- Non-component logic stays in `src/hooks/` and `src/lib/`.
