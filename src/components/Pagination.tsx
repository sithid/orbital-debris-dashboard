type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (next: number) => void
}

const numberFormat = new Intl.NumberFormat('en-US')

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 text-sm text-muted"
    >
      <p>
        Showing <span className="font-mono text-fg">{numberFormat.format(start)}</span>–
        <span className="font-mono text-fg">{numberFormat.format(end)}</span> of{' '}
        <span className="font-mono text-fg">{numberFormat.format(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
          className="rounded-lg border border-border px-3 py-1.5 text-fg hover:border-cyan disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
        >
          Previous
        </button>
        <span className="font-mono text-fg">
          {numberFormat.format(page)} / {numberFormat.format(totalPages)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
          className="rounded-lg border border-border px-3 py-1.5 text-fg hover:border-cyan disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
        >
          Next
        </button>
      </div>
    </nav>
  )
}
