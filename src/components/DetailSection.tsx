import type { ReactNode } from 'react'

export type DetailField = {
  label: string
  value: ReactNode
  mono?: boolean
}

type DetailSectionProps = {
  title: string
  fields: DetailField[]
}

const dash = '—'

export function formatValue(value: string | number | null | undefined): ReactNode {
  if (value === null || value === undefined || value === '') return dash
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return dash
    return Number.isInteger(value) ? value.toString() : value.toString()
  }
  return value
}

export function DetailSection({ title, fields }: DetailSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-lg">
      <h2 className="text-xs uppercase tracking-widest text-muted">{title}</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col">
            <dt className="text-xs uppercase tracking-widest text-faint">{f.label}</dt>
            <dd
              className={
                f.mono
                  ? 'mt-1 font-mono text-sm text-cyan break-all'
                  : 'mt-1 text-sm text-fg break-words'
              }
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
