export interface OrbitRow {
  norad_id: number
  object_name: string | null
  sma_km: number
  eccentricity: number
  inclination_deg: number
  orbit_class: string | null
}

export interface OrbitsResponse {
  orbits: OrbitRow[]
  sample: number
  seed: number
  total: number
}

const DEFAULT_SAMPLE = 1000
const MAX_SAMPLE = 10000

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return max !== undefined ? Math.min(n, max) : n
}

function parseNonNegInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

export async function getOrbits(env: Env, url: URL): Promise<OrbitsResponse> {
  const params = url.searchParams
  const sample = parsePositiveInt(params.get('sample'), DEFAULT_SAMPLE, MAX_SAMPLE)
  const seed = parseNonNegInt(params.get('seed'), 0)

  // Candidate set: objects with usable orbital geometry. The optional filters
  // below mirror the Objects-table API (worker/routes/objects.ts) so the globe
  // and the table agree on what each filter means.
  const where: string[] = [
    'o.semi_major_axis_km IS NOT NULL',
    'o.semi_major_axis_km > 0',
    'o.eccentricity IS NOT NULL',
    'o.inclination_degrees IS NOT NULL',
  ]
  const bindings: unknown[] = []

  // in_orbit defaults to 1 (the globe shows orbits that currently exist); an
  // explicit inOrbit=0 surfaces decayed objects instead.
  const inOrbit = params.get('inOrbit') === '0' ? 0 : 1
  where.push('s.in_orbit = ?')
  bindings.push(inOrbit)

  const objectType = params.get('objectType')
  if (objectType) {
    where.push('s.object_type = ?')
    bindings.push(objectType)
  }

  const orbitClass = params.get('orbitClass')
  if (orbitClass) {
    where.push('o.orbit_class = ?')
    bindings.push(orbitClass)
  }

  const ownerCode = params.get('ownerCode')
  if (ownerCode) {
    where.push('s.owner_code = ?')
    bindings.push(ownerCode)
  }

  const whereClause = where.join(' AND ')

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM satellites s
     JOIN orbital_data o ON o.norad_id = s.norad_id
     WHERE ${whereClause}`
  )
    .bind(...bindings)
    .first<{ total: number }>()
  const total = totalRow?.total ?? 0

  // Deterministic sample: order rows by (norad_id * seedMultiplier) mod prime.
  // Mixing the seed into the multiplier (rather than adding a constant) means
  // a different seed produces a different per-row hash, not just a rotation.
  const M = 2147483647n // 2^31 - 1, prime
  const A = 2654435761n // Knuth multiplicative constant
  const B = 1597334677n // co-prime large constant for seed mixing
  const seedMultiplier = Number(((A + BigInt(seed) * B) % M) || 1n)

  const dataResult = await env.DB.prepare(
    `SELECT
       s.norad_id            AS norad_id,
       s.object_name         AS object_name,
       o.semi_major_axis_km  AS sma_km,
       o.eccentricity        AS eccentricity,
       o.inclination_degrees AS inclination_deg,
       o.orbit_class         AS orbit_class
     FROM satellites s
     JOIN orbital_data o ON o.norad_id = s.norad_id
     WHERE ${whereClause}
     ORDER BY (s.norad_id * ?) % 2147483647, s.norad_id
     LIMIT ?`
  )
    .bind(...bindings, seedMultiplier, sample)
    .all<OrbitRow>()

  return {
    orbits: dataResult.results ?? [],
    sample,
    seed,
    total,
  }
}
