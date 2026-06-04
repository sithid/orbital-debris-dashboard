import { useEffect, useRef, useState } from 'react'
import type { CommonFilters } from '../lib/filterParams'
import type { Facets } from '../hooks/useFacets'
import { fieldClass, labelClass } from './filters/fieldStyles'
import { FacetSelect } from './filters/FacetSelect'
import { RangeInputs } from './filters/RangeInputs'
import { TristateSelect } from './filters/TristateSelect'

// Type / orbit-class option lists mirror src/pages/Objects.tsx. Owner and
// country are high-cardinality, so they come from the facets endpoint instead.
const OBJECT_TYPES = ['PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN', 'TBA']
const ORBIT_CLASSES = ['LEO', 'MEO', 'GEO', 'HEO', 'UNKNOWN']

const ZOMBIE_OPTIONS = [
  { value: '', label: 'All objects' },
  { value: '1', label: 'Zombies only' },
  { value: '0', label: 'Exclude zombies' },
]
// The globe defaults to in-orbit; "All" needs an explicit sentinel because the
// orbits API treats an absent inOrbit as "in-orbit only".
const IN_ORBIT_OPTIONS = [
  { value: '1', label: 'In orbit' },
  { value: '0', label: 'Decayed' },
  { value: 'all', label: 'All (incl. decayed)' },
]

export type GlobeFilterValues = CommonFilters & { sample: number }

type Props = {
  values: GlobeFilterValues
  facets: Facets
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

  useEffect(() => {
    setSearchInput(values.search)
  }, [values.search])

  useEffect(() => {
    if (searchInput === values.search) return
    const t = setTimeout(() => onChangeRef.current({ search: searchInput.trim() }), 300)
    return () => clearTimeout(t)
  }, [searchInput, values.search])

  // in_orbit defaults to '1' on the globe, so it only counts as "active" when changed.
  const hasActiveFilters =
    values.search !== '' ||
    values.objectType !== '' ||
    values.orbitClass !== '' ||
    values.ownerCode !== '' ||
    values.country !== '' ||
    values.minAltKm !== '' ||
    values.maxAltKm !== '' ||
    values.minInc !== '' ||
    values.maxInc !== '' ||
    values.minYear !== '' ||
    values.maxYear !== '' ||
    values.isZombie !== '' ||
    values.inOrbit !== '1'

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

        <FacetSelect
          label="Filter by object type"
          allLabel="All types"
          value={values.objectType}
          options={OBJECT_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(v) => onChange({ objectType: v })}
        />
        <FacetSelect
          label="Filter by orbit class"
          allLabel="All orbits"
          value={values.orbitClass}
          options={ORBIT_CLASSES.map((o) => ({ value: o, label: o }))}
          onChange={(v) => onChange({ orbitClass: v })}
        />
        <FacetSelect
          label="Filter by owner or operator"
          allLabel="All owners"
          value={values.ownerCode}
          options={facets.owners.map((o) => ({ value: o.code, label: o.name }))}
          onChange={(v) => onChange({ ownerCode: v })}
        />
        <FacetSelect
          label="Filter by operator country"
          allLabel="All countries"
          value={values.country}
          options={facets.countries.map((c) => ({ value: c, label: c }))}
          onChange={(v) => onChange({ country: v })}
        />

        <RangeInputs
          label="Altitude"
          unit="km"
          min={values.minAltKm}
          max={values.maxAltKm}
          placeholder={facets.bounds.altitudeKm}
          onCommit={({ min, max }) => onChange({ minAltKm: min, maxAltKm: max })}
        />
        <RangeInputs
          label="Inclination"
          unit="°"
          step={1}
          min={values.minInc}
          max={values.maxInc}
          placeholder={facets.bounds.inclinationDeg}
          onCommit={({ min, max }) => onChange({ minInc: min, maxInc: max })}
        />
        <RangeInputs
          label="Launch year"
          step={1}
          min={values.minYear}
          max={values.maxYear}
          placeholder={facets.bounds.launchYear}
          onCommit={({ min, max }) => onChange({ minYear: min, maxYear: max })}
        />

        <TristateSelect
          label="Status"
          value={values.inOrbit}
          options={IN_ORBIT_OPTIONS}
          onChange={(v) => onChange({ inOrbit: v })}
        />
        <TristateSelect
          label="Zombie"
          value={values.isZombie}
          options={ZOMBIE_OPTIONS}
          onChange={(v) => onChange({ isZombie: v })}
        />

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
