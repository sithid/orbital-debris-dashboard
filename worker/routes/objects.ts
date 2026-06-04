import { applyCommonFilters, optionalJoins } from '../lib/filters'

export interface ObjectRow {
  norad_id: number
  object_name: string | null
  object_type: string | null
  ops_status: string | null
  orbit_class: string | null
  owner_code: string | null
  in_orbit: number | null
  is_zombie: number | null
}

export interface ObjectsPage {
  total: number
  page: number
  pageSize: number
  data: ObjectRow[]
}

const SORTABLE_COLUMNS: Record<string, string> = {
  norad_id: 's.norad_id',
  object_name: 's.object_name',
  object_type: 's.object_type',
  ops_status: 's.ops_status',
  orbit_class: 'o.orbit_class',
  owner_code: 's.owner_code',
}

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

export class ObjectsQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ObjectsQueryError'
  }
}

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return max !== undefined ? Math.min(n, max) : n
}

export async function getObjects(env: Env, url: URL): Promise<ObjectsPage> {
  const params = url.searchParams

  const page = parsePositiveInt(params.get('page'), 1)
  const pageSize = parsePositiveInt(params.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

  const sortKey = params.get('sort') ?? 'norad_id'
  const sortColumn = SORTABLE_COLUMNS[sortKey]
  if (!sortColumn) {
    throw new ObjectsQueryError(`Invalid sort column: ${sortKey}`)
  }

  const orderRaw = (params.get('order') ?? 'asc').toLowerCase()
  const order = orderRaw === 'desc' ? 'DESC' : 'ASC'

  const { clauses, bindings, needs } = applyCommonFilters(params)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  // The table lists every object (no in-orbit/geometry restriction). orbital_data
  // and risk_assessment are always LEFT-joined so the orbit-class and zombie
  // columns are populated; ownership/launch are joined only when filtered on.
  const fromClause = `
    FROM satellites s
    LEFT JOIN orbital_data o ON o.norad_id = s.norad_id
    LEFT JOIN risk_assessment ra ON ra.norad_id = s.norad_id${optionalJoins({ ...needs, risk: false })}`

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`)
    .bind(...bindings)
    .first<{ total: number }>()
  const total = countRow?.total ?? 0

  const offset = (page - 1) * pageSize
  const dataResult = await env.DB.prepare(
    `SELECT
      s.norad_id      AS norad_id,
      s.object_name   AS object_name,
      s.object_type   AS object_type,
      s.ops_status    AS ops_status,
      o.orbit_class   AS orbit_class,
      s.owner_code    AS owner_code,
      s.in_orbit      AS in_orbit,
      ra.is_zombie    AS is_zombie
    ${fromClause}
    ${whereClause}
    ORDER BY ${sortColumn} ${order}, s.norad_id ASC
    LIMIT ? OFFSET ?`
  )
    .bind(...bindings, pageSize, offset)
    .all<ObjectRow>()

  return {
    total,
    page,
    pageSize,
    data: dataResult.results ?? [],
  }
}
