import { Card } from '../atoms/Card'
import { Eyebrow } from '../atoms/Eyebrow'

const ITEMS = [
  { color: 'bg-cyan', label: 'LEO — low Earth orbit' },
  { color: 'bg-gold', label: 'MEO — medium Earth orbit' },
  { color: 'bg-success', label: 'GEO — geostationary' },
  { color: 'bg-muted', label: 'Other / unknown' },
]

export function Legend() {
  return (
    <Card variant="overlay" className="pointer-events-auto p-4">
      <Eyebrow>Legend</Eyebrow>
      <ul className="mt-2 space-y-1 text-sm text-fg">
        {ITEMS.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <span aria-hidden className={`inline-block h-2 w-4 rounded ${i.color}`} />
            {i.label}
          </li>
        ))}
      </ul>
    </Card>
  )
}
