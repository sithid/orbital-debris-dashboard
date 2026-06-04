import { useEffect, useRef, useState } from 'react'
import type { OrbitFacets } from '../hooks/useOrbits'

// Type / orbit-class option lists mirror src/pages/Objects.tsx. Owner and
// country are high-cardinality, so they come from the facets endpoint instead.
const OBJECT_TYPES = ['PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN', 'TBA']
const ORBIT_CLASSES = ['LEO', 'MEO', 'GEO', 'HEO', 'UNKNOWN']

const fieldClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40'
const labelClass = 'block text-xs uppercase tracking-widest text-muted'

export type GlobeFilterValues = {
  search: string
  objectType: string
  orbitClass: string
  ownerCode: string
  country: string
  sample: number
}

type Props = {
  values: GlobeFilterValues
  facets: OrbitFacets
  sampleMax: number
  onChange: (patch: Partial<GlobeFilterValues>) => void
  onReset: () => void
}

export function GlobeFilters({ values, facets, sampleMax, onChange, onReset }: Props) {
  // Local, debounced mirror of the search box so each keystroke doesn't refetch.
  const [searchInput, setSearchInput] = useState(values.search)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Keep the input in sync when search is cleared/changed externally (e.g. Reset).
  useEffect(() => {
    setSearchInput(values.search)
  }, [values.search])

  // Push the debounced value up 300ms after typing stops.
  useEffect(() => {
    if (searchInput === values.search) return
    const t = setTimeout(() => onChangeRef.current({ search: searchInput.trim() }), 300)
    return () => clearTimeout(t)
  }, [searchInput, values.search])

  const hasActiveFilters =
    values.search !== '' ||
    values.objectType !== '' ||
    values.orbitClass !== '' ||
    values.ownerCode !== '' ||
    values.country !== ''

  return (
    <div className="pointer-events-auto rounded-lg border border-border bg-surface/85 p-4 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted">Filters</p>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="rounded px-2 py-1 text-xs text-cyan hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:text-faint"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="sr-only">Search by name or NORAD ID</span>
          <input
            type="search"
            inputMode="search"
            placeholder="Search name or NORAD ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={fieldClass}
            aria-label="Search by name or NORAD ID"
          />
        </label>

        <label className="block">
          <span className="sr-only">Object type</span>
          <select
            value={values.objectType}
            onChange={(e) => onChange({ objectType: e.target.value })}
            className={fieldClass}
            aria-label="Filter by object type"
          >
            <option value="">All types</option>
            {OBJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Orbit class</span>
          <select
            value={values.orbitClass}
            onChange={(e) => onChange({ orbitClass: e.target.value })}
            className={fieldClass}
            aria-label="Filter by orbit class"
          >
            <option value="">All orbits</option>
            {ORBIT_CLASSES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Owner / operator</span>
          <select
            value={values.ownerCode}
            onChange={(e) => onChange({ ownerCode: e.target.value })}
            className={fieldClass}
            aria-label="Filter by owner or operator"
          >
            <option value="">All owners</option>
            {facets.owners.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Operator country</span>
          <select
            value={values.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className={fieldClass}
            aria-label="Filter by operator country"
          >
            <option value="">All countries</option>
            {facets.countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>
            Max orbits:{' '}
            <span className="font-mono text-fg">{values.sample.toLocaleString()}</span>
          </span>
          <input
            type="range"
            min={500}
            max={sampleMax}
            step={500}
            value={Math.min(values.sample, sampleMax)}
            onChange={(e) => onChange({ sample: Number(e.target.value) })}
            className="mt-2 w-full accent-cyan"
            aria-label="Maximum orbits to render"
          />
        </label>
      </div>
    </div>
  )
}
