type StatCardProps = {
  label: string
  value: number | null
  hint?: string
}

const numberFormat = new Intl.NumberFormat('en-US')

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-lg">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-3 font-mono text-4xl text-cyan">
        {value === null ? '—' : numberFormat.format(value)}
      </p>
      {hint && <p className="mt-2 text-sm text-faint">{hint}</p>}
    </div>
  )
}
