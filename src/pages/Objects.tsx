import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '../components/DataTable'
import { Pagination } from '../components/Pagination'
import { SearchBar } from '../components/SearchBar'
import { useObjects, type ObjectRow, type ObjectsQuery, type SortOrder } from '../hooks/useObjects'

const OBJECT_TYPES = ['PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN', 'TBA']
const ORBIT_CLASSES = ['LEO', 'MEO', 'GEO', 'HEO', 'UNKNOWN']

const dash = '—'

function cell(value: string | number | null | undefined): React.ReactNode {
  if (value === null || value === undefined || value === '') return dash
  return value
}

export default function Objects() {
  const navigate = useNavigate()
  const [query, setQuery] = useState<ObjectsQuery>({
    page: 1,
    pageSize: 25,
    search: '',
    sort: 'norad_id',
    order: 'asc',
    objectType: '',
    orbitClass: '',
  })

  const state = useObjects(query)

  const columns: Column<ObjectRow>[] = useMemo(
    () => [
      {
        key: 'norad_id',
        header: 'NORAD ID',
        sortable: true,
        mono: true,
        render: (r) => r.norad_id,
      },
      {
        key: 'object_name',
        header: 'Object name',
        sortable: true,
        render: (r) => cell(r.object_name),
      },
      {
        key: 'object_type',
        header: 'Type',
        sortable: true,
        render: (r) => cell(r.object_type),
      },
      {
        key: 'orbit_class',
        header: 'Orbit class',
        sortable: true,
        render: (r) => cell(r.orbit_class),
      },
      {
        key: 'ops_status',
        header: 'Status',
        sortable: true,
        render: (r) => cell(r.ops_status),
      },
      {
        key: 'owner_code',
        header: 'Owner',
        sortable: true,
        mono: true,
        render: (r) => cell(r.owner_code),
      },
    ],
    []
  )

  const update = <K extends keyof ObjectsQuery>(key: K, value: ObjectsQuery[K]): void => {
    setQuery((prev) => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }))
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

  return (
    <section className="mx-auto max-w-7xl px-8 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted">Catalog</p>
        <h1 className="mt-2 text-3xl font-semibold text-fg">Objects</h1>
        <p className="mt-2 max-w-prose text-muted">
          Browse every tracked satellite and debris object. Search by name or NORAD ID, filter by
          type or orbit class, click any row for the full profile.
        </p>
      </header>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <SearchBar value={query.search} onChange={(v) => update('search', v)} />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted">
            <span className="sr-only">Object type</span>
            <select
              value={query.objectType}
              onChange={(e) => update('objectType', e.target.value)}
              className="mt-0 w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm text-fg focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40"
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
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted">
            <span className="sr-only">Orbit class</span>
            <select
              value={query.orbitClass}
              onChange={(e) => update('orbitClass', e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm text-fg focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40"
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
        </div>
      </div>

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
