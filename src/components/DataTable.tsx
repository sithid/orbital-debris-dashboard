import { ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import type { SortOrder } from '../hooks/useObjects'

export type Column<T> = {
  key: string
  header: string
  sortable?: boolean
  mono?: boolean
  render: (row: T) => React.ReactNode
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  sort: string
  order: SortOrder
  onSortChange: (column: string) => void
  isLoading: boolean
  emptyMessage?: string
}

function SortIcon({
  active,
  order,
}: {
  active: boolean
  order: SortOrder
}) {
  if (!active) {
    return <ChevronUpDownIcon aria-hidden className="h-4 w-4 text-faint" />
  }
  return order === 'asc' ? (
    <ChevronUpIcon aria-hidden className="h-4 w-4 text-cyan" />
  ) : (
    <ChevronDownIcon aria-hidden className="h-4 w-4 text-cyan" />
  )
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  sort,
  order,
  onSortChange,
  isLoading,
  emptyMessage = 'No results.',
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="bg-surface">
          <tr>
            {columns.map((col) => {
              const active = sort === col.key
              return (
                <th
                  key={col.key}
                  scope="col"
                  className="sticky top-0 border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted"
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className="flex items-center gap-1 text-muted hover:text-fg focus:outline-none focus:ring-2 focus:ring-cyan/40"
                    >
                      <span>{col.header}</span>
                      <SortIcon active={active} order={order} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-sm text-muted"
              >
                Loading…
              </td>
            </tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-sm text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={
                onRowClick
                  ? 'cursor-pointer border-b border-border hover:bg-surface'
                  : 'border-b border-border'
              }
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`border-b border-border px-4 py-3 text-sm ${
                    col.mono ? 'font-mono text-cyan' : 'text-fg'
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
