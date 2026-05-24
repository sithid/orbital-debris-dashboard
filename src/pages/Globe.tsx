import { useEffect, useState } from 'react'
import { OrbitGlobe, type OrbitDatum } from '../components/OrbitGlobe'

type OrbitsResponse = {
  orbits: OrbitDatum[]
  sample: number
  seed: number
  total: number
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: OrbitsResponse }
  | { status: 'error'; message: string }

const SAMPLE_SIZE = 2000
const SEED = 1

export default function GlobePage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/orbits?sample=${SAMPLE_SIZE}&seed=${SEED}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as OrbitsResponse
        setState({ status: 'ready', data })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load orbits',
        })
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="relative h-screen w-full overflow-hidden bg-background">
      {state.status === 'ready' && <OrbitGlobe orbits={state.data.orbits} />}

      <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-sm space-y-3">
        <div className="pointer-events-auto rounded-lg border border-border bg-surface/85 p-4 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-widest text-muted">Globe</p>
          <h1 className="mt-1 text-xl font-semibold text-fg">Orbit shells</h1>
          <p className="mt-2 text-sm text-muted">
            {state.status === 'ready' ? (
              <>
                Showing{' '}
                <span className="font-mono text-cyan">
                  {state.data.orbits.length.toLocaleString()}
                </span>{' '}
                of {state.data.total.toLocaleString()} in-orbit objects with
                usable orbital data.
              </>
            ) : state.status === 'loading' ? (
              'Loading orbital data...'
            ) : (
              <span className="text-danger">Couldn't load orbits: {state.message}</span>
            )}
          </p>
        </div>

        <div className="pointer-events-auto rounded-lg border border-border bg-surface/85 p-4 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-widest text-muted">Legend</p>
          <ul className="mt-2 space-y-1 text-sm text-fg">
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-4 rounded bg-cyan" />
              LEO — low Earth orbit
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-4 rounded bg-gold" />
              MEO — medium Earth orbit
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-4 rounded bg-success" />
              GEO — geostationary
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-4 rounded bg-muted" />
              Other / unknown
            </li>
          </ul>
        </div>

        <div className="pointer-events-auto rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-fg">
          <strong className="text-warning">Illustrative.</strong> Orbit
          orientations (RAAN, argument of perigee) are randomized at render
          time, and altitudes above Earth are exaggerated{' '}
          <span className="font-mono">2.5×</span> for visual clarity. This shows{' '}
          <em>which orbits exist</em>, not where objects are right now.
        </div>
      </div>
    </section>
  )
}
