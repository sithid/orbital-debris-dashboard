import type { Facets } from '../../hooks/useFacets'
import type { OrbitsState } from '../../hooks/useOrbits'
import { GlobeStatsPanel } from '../molecules/GlobeStatsPanel'
import { Legend } from '../molecules/Legend'
import { IllustrativeNotice } from '../molecules/IllustrativeNotice'
import { GlobeFilters, type GlobeFilterValues } from './GlobeFilters'

// The scrollable panel stack floating over the globe: stats, filters, legend,
// and the illustrative disclaimer.
export function GlobeOverlay({
  state,
  isDesktop,
  filters,
  facets,
  sampleMax,
  onChange,
  onReset,
}: {
  state: OrbitsState
  isDesktop: boolean
  filters: GlobeFilterValues
  facets: Facets
  sampleMax: number
  onChange: (patch: Partial<GlobeFilterValues>) => void
  onReset: () => void
}) {
  return (
    <div className="pointer-events-none absolute left-6 top-6 z-10 max-h-[calc(100vh-3rem)] w-72 max-w-[calc(100vw-3rem)] space-y-3 overflow-y-auto pr-1">
      <GlobeStatsPanel state={state} isDesktop={isDesktop} />
      <GlobeFilters
        values={filters}
        facets={facets}
        sampleMax={sampleMax}
        onChange={onChange}
        onReset={onReset}
      />
      <Legend />
      <IllustrativeNotice />
    </div>
  )
}
