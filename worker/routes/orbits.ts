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
// Above the ~34k candidate total, so the globe can request "all" while still
// guarding against absurd values. One InstancedMesh draw call absorbs this.
const MAX_SAMPLE = 40000

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

// Returns a finite number or null. A bad/empty range bound simply drops that
// side of the filter rather than erroring.
function parseFiniteNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Pushes `column >= min` / `column <= max` predicates for whichever bounds are set.
function addRange(
  where: string[],
  bindings: unknown[],
  minColumn: string,
  minValue: number | null,
  maxColumn: string,
  maxValue: number | null
): void {
  if (minValue !== null) {
    where.push(`${minColumn} >= ?`)
    bindings.push(minValue)
  }
  if (maxValue !== null) {
    where.push(`${maxColumn} <= ?`)
    bindings.push(maxValue)
  }
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

  // Name/NORAD search — same idiom as worker/routes/objects.ts: all-digit input
  // is an exact NORAD id; anything else is a case-insensitive name substring.
  const search = params.get('search')?.trim()
  if (search) {
    if (/^\d+$/.test(search)) {
      where.push('s.norad_id = ?')
      bindings.push(Number.parseInt(search, 10))
    } else {
      where.push('UPPER(s.object_name) LIKE ?')
      bindings.push(`%${search.toUpperCase()}%`)
    }
  }

  const country = params.get('country')
  if (country) {
    where.push('op.country_operator = ?')
    bindings.push(country)
  }

  // Altitude band — containment: the whole orbit sits within [min, max], i.e.
  // perigee >= minAlt and apogee <= maxAlt. A high-apogee transfer orbit that
  // only dips into the band at perigee is excluded (its apogee is above max).
  addRange(
    where,
    bindings,
    'o.perigee_km',
    parseFiniteNumber(params.get('minAltKm')),
    'o.apogee_km',
    parseFiniteNumber(params.get('maxAltKm'))
  )

  // Inclination range.
  addRange(
    where,
    bindings,
    'o.inclination_degrees',
    parseFiniteNumber(params.get('minInc')),
    'o.inclination_degrees',
    parseFiniteNumber(params.get('maxInc'))
  )

  // Launch-year range (resolved through launch_events).
  addRange(
    where,
    bindings,
    'le.launch_year',
    parseFiniteNumber(params.get('minYear')),
    'le.launch_year',
    parseFiniteNumber(params.get('maxYear'))
  )

  const whereClause = where.join(' AND ')

  // ownership_operators / launch_events are LEFT-joined so the country and
  // launch-year filters resolve without dropping objects that lack those rows.
  const fromClause = `
    FROM satellites s
    JOIN orbital_data o ON o.norad_id = s.norad_id
    LEFT JOIN ownership_operators op ON op.owner_code = s.owner_code
    LEFT JOIN launch_events le ON le.launch_id = s.launch_id`

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     ${fromClause}
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
     ${fromClause}
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
