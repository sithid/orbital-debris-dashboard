export interface OrbitRow {
  norad_id: number
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

  // Candidate set: in-orbit objects with usable orbital geometry.
  const baseWhere = `
    s.in_orbit = 1
    AND o.semi_major_axis_km IS NOT NULL
    AND o.semi_major_axis_km > 0
    AND o.eccentricity IS NOT NULL
    AND o.inclination_degrees IS NOT NULL
  `

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM satellites s
     JOIN orbital_data o ON o.norad_id = s.norad_id
     WHERE ${baseWhere}`
  ).first<{ total: number }>()
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
       o.semi_major_axis_km  AS sma_km,
       o.eccentricity        AS eccentricity,
       o.inclination_degrees AS inclination_deg,
       o.orbit_class         AS orbit_class
     FROM satellites s
     JOIN orbital_data o ON o.norad_id = s.norad_id
     WHERE ${baseWhere}
     ORDER BY (s.norad_id * ?) % 2147483647, s.norad_id
     LIMIT ?`
  )
    .bind(seedMultiplier, sample)
    .all<OrbitRow>()

  return {
    orbits: dataResult.results ?? [],
    sample,
    seed,
    total,
  }
}
