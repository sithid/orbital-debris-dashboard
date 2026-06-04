import type { OrbitDatum } from '../../hooks/useOrbits'

// Names the orbit currently under the cursor on the globe. Renders nothing when
// nothing is hovered.
export function HoverChip({ orbit }: { orbit: OrbitDatum | null }) {
  if (!orbit) return null
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
      <span className="font-medium text-fg">{orbit.object_name ?? 'Unnamed object'}</span>
      <span className="ml-2 font-mono text-xs text-muted">
        NORAD {orbit.norad_id}
        {orbit.orbit_class ? ` · ${orbit.orbit_class}` : ''}
      </span>
      <span className="ml-2 text-xs text-cyan">click to open →</span>
    </div>
  )
}
