import type { ReactNode } from 'react'
import { Card } from '../atoms/Card'
import { Eyebrow } from '../atoms/Eyebrow'

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
    <Card as="section" className="p-6">
      <Eyebrow as="h2">{title}</Eyebrow>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col">
            <Eyebrow as="dt" tone="faint">
              {f.label}
            </Eyebrow>
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
    </Card>
  )
}
