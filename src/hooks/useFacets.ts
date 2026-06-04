import { useEffect, useState } from 'react'

export type OwnerFacet = { code: string; name: string }
export type RangeBound = { min: number; max: number }
export type FilterBounds = {
  altitudeKm: RangeBound
  inclinationDeg: RangeBound
  launchYear: RangeBound
}
export type Facets = {
  owners: OwnerFacet[]
  countries: string[]
  bounds: FilterBounds
}

const ZERO_BOUND: RangeBound = { min: 0, max: 0 }
export const EMPTY_FACETS: Facets = {
  owners: [],
  countries: [],
  bounds: { altitudeKm: ZERO_BOUND, inclinationDeg: ZERO_BOUND, launchYear: ZERO_BOUND },
}

/**
 * Fetch the owner/country dropdown options + range bounds for a filter UI. The
 * Objects table uses /api/objects/facets (all objects); the globe uses
 * /api/orbits/facets (in-orbit candidates). Failure degrades to empty lists so
 * the dropdowns simply show "All".
 */
export function useFacets(endpoint: string): Facets {
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS)

  useEffect(() => {
    const controller = new AbortController()
    fetch(endpoint, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setFacets((await res.json()) as Facets)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFacets(EMPTY_FACETS)
      })
    return () => controller.abort()
  }, [endpoint])

  return facets
}
