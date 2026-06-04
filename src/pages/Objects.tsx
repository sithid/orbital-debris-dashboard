import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '../components/organisms/DataTable'
import { ObjectsToolbar } from '../components/organisms/ObjectsToolbar'
import { Pagination } from '../components/molecules/Pagination'
import { Badge } from '../components/atoms/Badge'
import { Eyebrow } from '../components/atoms/Eyebrow'
import { useFacets } from '../hooks/useFacets'
import { countActiveFilters, EMPTY_COMMON_FILTERS, type CommonFilters } from '../lib/filterParams'
import { useObjects, type ObjectRow, type ObjectsQuery, type SortOrder } from '../hooks/useObjects'

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
        render: (r) => (r.is_zombie === 1 ? <Badge variant="warning">Zombie</Badge> : dash),
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
        <Eyebrow>Catalog</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold text-fg">Objects</h1>
        <p className="mt-2 max-w-prose text-muted">
          Browse every tracked satellite and debris object. Search by name or NORAD ID, filter by
          type, orbit, owner, altitude, and more, click any row for the full profile.
        </p>
      </header>

      <ObjectsToolbar
        values={query}
        facets={facets}
        advancedCount={advancedCount}
        onUpdate={update}
        onUpdateFilters={updateFilters}
        onReset={resetFilters}
      />

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
