import { useEffect, useState } from 'react'
import { appendFilterParams, type CommonFilters } from '../lib/filterParams'

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

export type OrbitsQuery = CommonFilters & {
  sample: number
  seed: number
}

export type OrbitsState =
  | { status: 'loading' }
  | { status: 'ready'; data: OrbitsResponse }
  | { status: 'error'; message: string }

export function buildOrbitsQuery(q: OrbitsQuery): string {
  const params = new URLSearchParams()
  params.set('sample', String(q.sample))
  params.set('seed', String(q.seed))
  appendFilterParams(params, q)
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
