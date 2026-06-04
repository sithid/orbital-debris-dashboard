import { Card } from '../atoms/Card'
import { Eyebrow } from '../atoms/Eyebrow'

type StatCardProps = {
  label: string
  value: number | null
  hint?: string
}

const numberFormat = new Intl.NumberFormat('en-US')

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="p-6">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-3 font-mono text-4xl text-cyan">
        {value === null ? '—' : numberFormat.format(value)}
      </p>
      {hint && <p className="mt-2 text-sm text-faint">{hint}</p>}
    </Card>
  )
}
