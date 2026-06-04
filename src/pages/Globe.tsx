import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrbitGlobe } from '../components/OrbitGlobe'
import { GlobeFilters, type GlobeFilterValues } from '../components/GlobeFilters'
import { useOrbits, type OrbitDatum } from '../hooks/useOrbits'
import { useFacets } from '../hooks/useFacets'
import { EMPTY_COMMON_FILTERS } from '../lib/filterParams'

const SEED = 1
// Slider ceilings: desktop can request the whole catalog; small screens are held
// to a perf-safe cap so a phone GPU isn't asked to draw tens of thousands.
const DESKTOP_SAMPLE_MAX = 40000
const MOBILE_SAMPLE_MAX = 2000
// Default to a moderate cap so the first paint isn't maximally cluttered — the
// user dials up/down from here.
const DEFAULT_DESKTOP_SAMPLE = 6000
const DEFAULT_MOBILE_SAMPLE = 1000

// Stable empty reference so the globe doesn't rebuild its instanced mesh on
// every render while a (re)fetch is in flight.
const NO_ORBITS: OrbitDatum[] = []

const isDesktopNow = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

// True at or above the md breakpoint (768px) — the same boundary the sidebar uses.
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(isDesktopNow)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

// The globe shows orbits that currently exist, so its reset/default state is
// in-orbit (not "all" — see GlobeFilters IN_ORBIT_OPTIONS).
const GLOBE_DEFAULT_FILTERS = { ...EMPTY_COMMON_FILTERS, inOrbit: '1' } as const

export default function GlobePage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const facets = useFacets('/api/orbits/facets')
  const [hovered, setHovered] = useState<OrbitDatum | null>(null)
  const [filters, setFilters] = useState<GlobeFilterValues>(() => ({
    ...GLOBE_DEFAULT_FILTERS,
    sample: isDesktopNow() ? DEFAULT_DESKTOP_SAMPLE : DEFAULT_MOBILE_SAMPLE,
  }))

  const sampleMax = isDesktop ? DESKTOP_SAMPLE_MAX : MOBILE_SAMPLE_MAX

  const state = useOrbits({
    ...filters,
    seed: SEED,
    // Clamp the effective request so resizing to mobile can't fetch a huge set.
    sample: Math.min(filters.sample, sampleMax),
  })

  const update = (patch: Partial<GlobeFilterValues>): void =>
    setFilters((prev) => ({ ...prev, ...patch }))
  const reset = (): void => setFilters((prev) => ({ ...prev, ...GLOBE_DEFAULT_FILTERS }))

  const ready = state.status === 'ready' ? state.data : null

  return (
    <section className="relative h-screen w-full overflow-hidden bg-background">
      {/* Kept mounted across filter refetches so the Earth + camera persist;
          only the instanced orbit mesh swaps when the data changes. */}
      <OrbitGlobe
        orbits={ready ? ready.orbits : NO_ORBITS}
        onHover={setHovered}
        onSelect={(o) => navigate(`/objects/${o.norad_id}`)}
      />

      <div className="pointer-events-none absolute left-6 top-6 z-10 max-h-[calc(100vh-3rem)] w-72 max-w-[calc(100vw-3rem)] space-y-3 overflow-y-auto pr-1">
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
                of {state.data.total.toLocaleString()} orbits matching the current
                filters.
              </>
            ) : state.status === 'loading' ? (
              'Loading orbital data...'
            ) : (
              <span className="text-danger">Couldn't load orbits: {state.message}</span>
            )}
          </p>
          {!isDesktop && (
            <p className="mt-2 text-xs text-muted">
              Showing a reduced sample on small screens — open on a larger display
              for the full set.
            </p>
          )}
        </div>

        <GlobeFilters
          values={filters}
          facets={facets}
          sampleMax={sampleMax}
          onChange={update}
          onReset={reset}
        />

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
          orientations (RAAN, argument of perigee) are randomized at render time,
          and altitudes above Earth are exaggerated{' '}
          <span className="font-mono">2.5×</span> for visual clarity. This shows{' '}
          <em>which orbits exist</em>, not where objects are right now.
        </div>
      </div>

      {/* Hover chip — names the orbit currently under the cursor. */}
      {hovered && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
          <span className="font-medium text-fg">
            {hovered.object_name ?? 'Unnamed object'}
          </span>
          <span className="ml-2 font-mono text-xs text-muted">
            NORAD {hovered.norad_id}
            {hovered.orbit_class ? ` · ${hovered.orbit_class}` : ''}
          </span>
          <span className="ml-2 text-xs text-cyan">click to open →</span>
        </div>
      )}
    </section>
  )
}
