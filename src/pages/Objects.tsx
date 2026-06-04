import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { DataTable, type Column } from '../components/DataTable'
import { Pagination } from '../components/Pagination'
import { SearchBar } from '../components/SearchBar'
import { FacetSelect } from '../components/filters/FacetSelect'
import { RangeInputs } from '../components/filters/RangeInputs'
import { TristateSelect } from '../components/filters/TristateSelect'
import { useFacets } from '../hooks/useFacets'
import {
  countActiveFilters,
  EMPTY_COMMON_FILTERS,
  type CommonFilters,
} from '../lib/filterParams'
import { useObjects, type ObjectRow, type ObjectsQuery, type SortOrder } from '../hooks/useObjects'

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

const INITIAL_QUERY: ObjectsQuery = {
  ...EMPTY_COMMON_FILTERS,
  page: 1,
  pageSize: 25,
  sort: 'norad_id',
  order: 'asc',
}

const dash = '—'

function cell(value: string | number | null | undefined): React.ReactNode {
  if (value === null || value === undefined || value === '') return dash
  return value
}

export default function Objects() {
  const navigate = useNavigate()
  const facets = useFacets('/api/objects/facets')
  const [query, setQuery] = useState<ObjectsQuery>(INITIAL_QUERY)

  const state = useObjects(query)

  const columns: Column<ObjectRow>[] = useMemo(
    () => [
      { key: 'norad_id', header: 'NORAD ID', sortable: true, mono: true, render: (r) => r.norad_id },
      {
        key: 'object_name',
        header: 'Object name',
        sortable: true,
        render: (r) => cell(r.object_name),
      },
      { key: 'object_type', header: 'Type', sortable: true, render: (r) => cell(r.object_type) },
      { key: 'orbit_class', header: 'Orbit class', sortable: true, render: (r) => cell(r.orbit_class) },
      { key: 'ops_status', header: 'Status', sortable: true, render: (r) => cell(r.ops_status) },
      { key: 'owner_code', header: 'Owner', sortable: true, mono: true, render: (r) => cell(r.owner_code) },
      {
        key: 'is_zombie',
        header: 'Zombie',
        sortable: false,
        render: (r) =>
          r.is_zombie === 1 ? (
            <span className="rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
              Zombie
            </span>
          ) : (
            dash
          ),
      },
    ],
    []
  )

  // Updating any filter resets to page 1; paging itself keeps the rest of the query.
  const update = <K extends keyof ObjectsQuery>(key: K, value: ObjectsQuery[K]): void => {
    setQuery((prev) => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }))
  }

  const updateFilters = (patch: Partial<CommonFilters>): void => {
    setQuery((prev) => ({ ...prev, ...patch, page: 1 }))
  }

  const resetFilters = (): void => {
    setQuery((prev) => ({ ...prev, ...EMPTY_COMMON_FILTERS, page: 1 }))
  }

  const handleSortChange = (column: string): void => {
    setQuery((prev) => {
      const nextOrder: SortOrder =
        prev.sort === column ? (prev.order === 'asc' ? 'desc' : 'asc') : 'asc'
      return { ...prev, sort: column, order: nextOrder, page: 1 }
    })
  }

  const ready = state.status === 'ready' ? state.data : null
  const rows = ready?.data ?? []
  const total = ready?.total ?? 0
  const isLoading = state.status === 'loading'

  // Filters tucked in the disclosure (everything except the always-visible trio).
  const advancedCount = countActiveFilters({
    ...query,
    search: '',
    objectType: '',
    orbitClass: '',
  })

  return (
    <section className="mx-auto max-w-7xl px-8 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted">Catalog</p>
        <h1 className="mt-2 text-3xl font-semibold text-fg">Objects</h1>
        <p className="mt-2 max-w-prose text-muted">
          Browse every tracked satellite and debris object. Search by name or NORAD ID, filter by
          type, orbit, owner, altitude, and more, click any row for the full profile.
        </p>
      </header>

      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <SearchBar value={query.search} onChange={(v) => update('search', v)} />
        <FacetSelect
          label="Filter by object type"
          allLabel="All types"
          value={query.objectType}
          options={OBJECT_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(v) => update('objectType', v)}
        />
        <FacetSelect
          label="Filter by orbit class"
          allLabel="All orbits"
          value={query.orbitClass}
          options={ORBIT_CLASSES.map((o) => ({ value: o, label: o }))}
          onChange={(v) => update('orbitClass', v)}
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
                  <span className="rounded-full bg-cyan/20 px-2 text-xs font-medium text-cyan">
                    {advancedCount}
                  </span>
                )}
              </DisclosureButton>
              {advancedCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
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
                value={query.ownerCode}
                options={facets.owners.map((o) => ({ value: o.code, label: o.name }))}
                onChange={(v) => update('ownerCode', v)}
              />
              <FacetSelect
                label="Filter by operator country"
                allLabel="All countries"
                value={query.country}
                options={facets.countries.map((c) => ({ value: c, label: c }))}
                onChange={(v) => update('country', v)}
              />
              <TristateSelect
                label="Status"
                value={query.inOrbit}
                options={IN_ORBIT_OPTIONS}
                onChange={(v) => update('inOrbit', v)}
              />
              <RangeInputs
                label="Altitude"
                unit="km"
                min={query.minAltKm}
                max={query.maxAltKm}
                placeholder={facets.bounds.altitudeKm}
                onCommit={({ min, max }) => updateFilters({ minAltKm: min, maxAltKm: max })}
              />
              <RangeInputs
                label="Inclination"
                unit="°"
                step={1}
                min={query.minInc}
                max={query.maxInc}
                placeholder={facets.bounds.inclinationDeg}
                onCommit={({ min, max }) => updateFilters({ minInc: min, maxInc: max })}
              />
              <RangeInputs
                label="Launch year"
                step={1}
                min={query.minYear}
                max={query.maxYear}
                placeholder={facets.bounds.launchYear}
                onCommit={({ min, max }) => updateFilters({ minYear: min, maxYear: max })}
              />
              <TristateSelect
                label="Zombie"
                value={query.isZombie}
                options={ZOMBIE_OPTIONS}
                onChange={(v) => update('isZombie', v)}
              />
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>

      {state.status === 'error' && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          Couldn't load objects: {state.message}
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface shadow-lg">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.norad_id}
          onRowClick={(r) => navigate(`/objects/${r.norad_id}`)}
          sort={query.sort}
          order={query.order}
          onSortChange={handleSortChange}
          isLoading={isLoading}
        />
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={total}
          onPageChange={(p) => update('page', p)}
        />
      </div>
    </section>
  )
}
