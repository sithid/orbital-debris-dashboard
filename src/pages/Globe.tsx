import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrbitGlobe } from '../components/organisms/OrbitGlobe'
import { GlobeOverlay } from '../components/organisms/GlobeOverlay'
import { HoverChip } from '../components/molecules/HoverChip'
import type { GlobeFilterValues } from '../components/organisms/GlobeFilters'
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
const DEFAULT_DESKTOP_SAMPLE = 3000
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

      <GlobeOverlay
        state={state}
        isDesktop={isDesktop}
        filters={filters}
        facets={facets}
        sampleMax={sampleMax}
        onChange={update}
        onReset={reset}
      />

      <HoverChip orbit={hovered} />
    </section>
  )
}
