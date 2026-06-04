import { useEffect, useState } from 'react'
import { appendFilterParams, type CommonFilters } from '../lib/filterParams'

export type ObjectRow = {
  norad_id: number
  object_name: string | null
  object_type: string | null
  ops_status: string | null
  orbit_class: string | null
  owner_code: string | null
  in_orbit: number | null
  is_zombie: number | null
}

export type ObjectsPage = {
  total: number
  page: number
  pageSize: number
  data: ObjectRow[]
}

export type SortOrder = 'asc' | 'desc'

export type ObjectsQuery = CommonFilters & {
  page: number
  pageSize: number
  sort: string
  order: SortOrder
}

export type ObjectsState =
  | { status: 'loading' }
  | { status: 'ready'; data: ObjectsPage }
  | { status: 'error'; message: string }

export function buildQueryString(q: ObjectsQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(q.page))
  params.set('pageSize', String(q.pageSize))
  params.set('sort', q.sort)
  params.set('order', q.order)
  appendFilterParams(params, q)
  return params.toString()
}

export function useObjects(query: ObjectsQuery): ObjectsState {
  const [state, setState] = useState<ObjectsState>({ status: 'loading' })
  const qs = buildQueryString(query)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetch(`/api/objects?${qs}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as ObjectsPage
        setState({ status: 'ready', data })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load objects',
        })
      })
    return () => controller.abort()
  }, [qs])

  return state
}
