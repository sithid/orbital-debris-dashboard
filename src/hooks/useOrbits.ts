import { useEffect, useState } from 'react'

export type OrbitDatum = {
  norad_id: number
  object_name: string | null
  sma_km: number
  eccentricity: number
  inclination_deg: number
  orbit_class: string | null
}

export type OrbitsResponse = {
  orbits: OrbitDatum[]
  sample: number
  seed: number
  total: number
}

export type OrbitsQuery = {
  sample: number
  seed: number
  search: string
  objectType: string
  orbitClass: string
  ownerCode: string
  country: string
}

export type OrbitsState =
  | { status: 'loading' }
  | { status: 'ready'; data: OrbitsResponse }
  | { status: 'error'; message: string }

export function buildOrbitsQuery(q: OrbitsQuery): string {
  const params = new URLSearchParams()
  params.set('sample', String(q.sample))
  params.set('seed', String(q.seed))
  if (q.search) params.set('search', q.search)
  if (q.objectType) params.set('objectType', q.objectType)
  if (q.orbitClass) params.set('orbitClass', q.orbitClass)
  if (q.ownerCode) params.set('ownerCode', q.ownerCode)
  if (q.country) params.set('country', q.country)
  return params.toString()
}

export function useOrbits(query: OrbitsQuery): OrbitsState {
  const [state, setState] = useState<OrbitsState>({ status: 'loading' })
  const qs = buildOrbitsQuery(query)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetch(`/api/orbits?${qs}`, { signal: controller.signal })
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
  }, [qs])

  return state
}

export type OrbitOwnerFacet = { code: string; name: string }
export type OrbitFacets = { owners: OrbitOwnerFacet[]; countries: string[] }

const EMPTY_FACETS: OrbitFacets = { owners: [], countries: [] }

/**
 * Fetch the owner/country dropdown options once. These are high-cardinality
 * (129 owners, 74 countries) so they come from the server's /api/orbits/facets
 * endpoint rather than being hardcoded. Failure degrades gracefully to empty
 * lists — the dropdowns just show "All".
 */
export function useOrbitFacets(): OrbitFacets {
  const [facets, setFacets] = useState<OrbitFacets>(EMPTY_FACETS)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/orbits/facets', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setFacets((await res.json()) as OrbitFacets)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFacets(EMPTY_FACETS)
      })
    return () => controller.abort()
  }, [])

  return facets
}
