import { Card } from '../atoms/Card'
import { Eyebrow } from '../atoms/Eyebrow'
import type { OrbitsState } from '../../hooks/useOrbits'

// Title + live "showing N of M" count for the globe, plus the small-screen note.
export function GlobeStatsPanel({
  state,
  isDesktop,
}: {
  state: OrbitsState
  isDesktop: boolean
}) {
  return (
    <Card variant="overlay" className="pointer-events-auto p-4">
      <Eyebrow>Globe</Eyebrow>
      <h1 className="mt-1 text-xl font-semibold text-fg">Orbit shells</h1>
      <p className="mt-2 text-sm text-muted">
        {state.status === 'ready' ? (
          <>
            Showing{' '}
            <span className="font-mono text-cyan">
              {state.data.orbits.length.toLocaleString()}
            </span>{' '}
            of {state.data.total.toLocaleString()} orbits matching the current filters.
          </>
        ) : state.status === 'loading' ? (
          'Loading orbital data...'
        ) : (
          <span className="text-danger">Couldn't load orbits: {state.message}</span>
        )}
      </p>
      {!isDesktop && (
        <p className="mt-2 text-xs text-muted">
          Showing a reduced sample on small screens — open on a larger display for the full
          set.
        </p>
      )}
    </Card>
  )
}
