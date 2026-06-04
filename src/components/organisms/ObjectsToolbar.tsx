import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { CommonFilters } from '../../lib/filterParams'
import type { Facets } from '../../hooks/useFacets'
import { Badge } from '../atoms/Badge'
import { SearchBar } from '../molecules/SearchBar'
import { FacetSelect } from '../molecules/FacetSelect'
import { RangeInputs } from '../molecules/RangeInputs'
import { TristateSelect } from '../molecules/TristateSelect'

const OBJECT_TYPES = ['PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN', 'TBA']
const ORBIT_CLASSES = ['LEO', 'MEO', 'GEO', 'HEO', 'UNKNOWN']

const IN_ORBIT_OPTIONS = [
  { value: '', label: 'All' },
  { value: '1', label: 'In orbit' },
  { value: '0', label: 'Decayed' },
]
const ZOMBIE_OPTIONS = [
  { value: '', label: 'All objects' },
  { value: '1', label: 'Zombies only' },
  { value: '0', label: 'Exclude zombies' },
]

type Props = {
  values: CommonFilters
  facets: Facets
  advancedCount: number
  onUpdate: (key: keyof CommonFilters, value: string) => void
  onUpdateFilters: (patch: Partial<CommonFilters>) => void
  onReset: () => void
}

// The Objects-table filter bar: always-visible search + type + orbit, plus a
// "More filters" disclosure with owner/country/ranges/zombie/in_orbit.
export function ObjectsToolbar({
  values,
  facets,
  advancedCount,
  onUpdate,
  onUpdateFilters,
  onReset,
}: Props) {
  return (
    <>
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <SearchBar value={values.search} onChange={(v) => onUpdate('search', v)} />
        <FacetSelect
          label="Filter by object type"
          allLabel="All types"
          value={values.objectType}
          options={OBJECT_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(v) => onUpdate('objectType', v)}
        />
        <FacetSelect
          label="Filter by orbit class"
          allLabel="All orbits"
          value={values.orbitClass}
          options={ORBIT_CLASSES.map((o) => ({ value: o, label: o }))}
          onChange={(v) => onUpdate('orbitClass', v)}
        />
      </div>

      <Disclosure>
        {({ open }) => (
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <DisclosureButton className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">
                <ChevronDownIcon
                  aria-hidden
                  className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
                More filters
                {advancedCount > 0 && (
                  <Badge variant="accent" className="rounded-full">
                    {advancedCount}
                  </Badge>
                )}
              </DisclosureButton>
              {advancedCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs text-cyan hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                >
                  Reset filters
                </button>
              )}
            </div>

            <DisclosurePanel className="mt-3 grid gap-4 rounded-lg border border-border bg-surface p-4 md:grid-cols-3">
              <FacetSelect
                label="Filter by owner or operator"
                allLabel="All owners"
                value={values.ownerCode}
                options={facets.owners.map((o) => ({ value: o.code, label: o.name }))}
                onChange={(v) => onUpdate('ownerCode', v)}
              />
              <FacetSelect
                label="Filter by operator country"
                allLabel="All countries"
                value={values.country}
                options={facets.countries.map((c) => ({ value: c, label: c }))}
                onChange={(v) => onUpdate('country', v)}
              />
              <TristateSelect
                label="Status"
                value={values.inOrbit}
                options={IN_ORBIT_OPTIONS}
                onChange={(v) => onUpdate('inOrbit', v)}
              />
              <RangeInputs
                label="Altitude"
                unit="km"
                min={values.minAltKm}
                max={values.maxAltKm}
                placeholder={facets.bounds.altitudeKm}
                onCommit={({ min, max }) => onUpdateFilters({ minAltKm: min, maxAltKm: max })}
              />
              <RangeInputs
                label="Inclination"
                unit="°"
                step={1}
                min={values.minInc}
                max={values.maxInc}
                placeholder={facets.bounds.inclinationDeg}
                onCommit={({ min, max }) => onUpdateFilters({ minInc: min, maxInc: max })}
              />
              <RangeInputs
                label="Launch year"
                step={1}
                min={values.minYear}
                max={values.maxYear}
                placeholder={facets.bounds.launchYear}
                onCommit={({ min, max }) => onUpdateFilters({ minYear: min, maxYear: max })}
              />
              <TristateSelect
                label="Zombie"
                value={values.isZombie}
                options={ZOMBIE_OPTIONS}
                onChange={(v) => onUpdate('isZombie', v)}
              />
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </>
  )
}
