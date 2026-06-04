import { getFacets, type OrbitFacets } from '../lib/facets'

// The objects table lists every object, so its dropdowns cover the full catalog
// (not just the in-orbit candidate set the globe uses).
export function getObjectFacets(env: Env): Promise<OrbitFacets> {
  return getFacets(env, '1 = 1')
}
