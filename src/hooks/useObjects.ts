import { useEffect, useState } from 'react'

export type ObjectRow = {
  norad_id: number
  object_name: string | null
  object_type: string | null
  ops_status: string | null
  orbit_class: string | null
  owner_code: string | null
  in_orbit: number | null
}

export type ObjectsPage = {
  total: number
  page: number
  pageSize: number
  data: ObjectRow[]
}

export type SortOrder = 'asc' | 'desc'

export type ObjectsQuery = {
  page: number
  pageSize: number
  search: string
  sort: string
  order: SortOrder
  objectType: string
  orbitClass: string
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
  if (q.search) params.set('search', q.search)
  if (q.objectType) params.set('objectType', q.objectType)
  if (q.orbitClass) params.set('orbitClass', q.orbitClass)
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
