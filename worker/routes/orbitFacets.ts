import { getFacets, type OrbitFacets } from '../lib/facets'

export type { OrbitFacets } from '../lib/facets'

// The globe's candidate set: in-orbit objects with usable geometry. Facets list
// only values that actually appear here, so a dropdown never offers a filter
// that would return nothing.
const CANDIDATE = `
  s.in_orbit = 1
  AND o.semi_major_axis_km IS NOT NULL
  AND o.semi_major_axis_km > 0
  AND o.eccentricity IS NOT NULL
  AND o.inclination_degrees IS NOT NULL
`

export function getOrbitFacets(env: Env): Promise<OrbitFacets> {
  return getFacets(env, CANDIDATE)
}
