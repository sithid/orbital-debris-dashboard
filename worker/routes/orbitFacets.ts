export interface OrbitOwnerFacet {
  code: string
  name: string
}

export interface RangeBound {
  min: number
  max: number
}

export interface OrbitBounds {
  altitudeKm: RangeBound
  inclinationDeg: RangeBound
  launchYear: RangeBound
}

export interface OrbitFacets {
  owners: OrbitOwnerFacet[]
  countries: string[]
  bounds: OrbitBounds
}

// Same candidate set the globe renders: in-orbit objects with usable geometry.
// Facets list only values that actually appear here, so the dropdowns never
// offer a filter that would return nothing.
const CANDIDATE = `
  s.in_orbit = 1
  AND o.semi_major_axis_km IS NOT NULL
  AND o.semi_major_axis_km > 0
  AND o.eccentricity IS NOT NULL
  AND o.inclination_degrees IS NOT NULL
`

export async function getOrbitFacets(env: Env): Promise<OrbitFacets> {
  // Some upstream operator rows have a missing name or the literal placeholder
  // "owner" (e.g. owner_code NICO). Fall back to the code so the dropdown shows a
  // distinguishable label instead of repeating "owner" for every such operator.
  const owners = await env.DB.prepare(
    `SELECT DISTINCT
       s.owner_code AS code,
       CASE
         WHEN op.owner IS NULL OR TRIM(op.owner) = '' OR LOWER(TRIM(op.owner)) = 'owner'
         THEN s.owner_code
         ELSE op.owner
       END AS name
     FROM satellites s
     JOIN orbital_data o ON o.norad_id = s.norad_id
     LEFT JOIN ownership_operators op ON op.owner_code = s.owner_code
     WHERE ${CANDIDATE}
       AND s.owner_code IS NOT NULL
       AND s.owner_code <> ''
     ORDER BY name COLLATE NOCASE`
  ).all<OrbitOwnerFacet>()

  const countries = await env.DB.prepare(
    `SELECT DISTINCT op.country_operator AS country
     FROM satellites s
     JOIN orbital_data o ON o.norad_id = s.norad_id
     JOIN ownership_operators op ON op.owner_code = s.owner_code
     WHERE ${CANDIDATE}
       AND op.country_operator IS NOT NULL
       AND op.country_operator <> ''
     ORDER BY country COLLATE NOCASE`
  ).all<{ country: string }>()

  // Min/max for the range-filter number inputs (altitude / inclination / year).
  const bounds = await env.DB.prepare(
    `SELECT
       MIN(o.perigee_km)          AS alt_min,
       MAX(o.apogee_km)           AS alt_max,
       MIN(o.inclination_degrees) AS inc_min,
       MAX(o.inclination_degrees) AS inc_max,
       MIN(le.launch_year)        AS year_min,
       MAX(le.launch_year)        AS year_max
     FROM satellites s
     JOIN orbital_data o ON o.norad_id = s.norad_id
     LEFT JOIN launch_events le ON le.launch_id = s.launch_id
     WHERE ${CANDIDATE}`
  ).first<{
    alt_min: number | null
    alt_max: number | null
    inc_min: number | null
    inc_max: number | null
    year_min: number | null
    year_max: number | null
  }>()

  const bound = (min: number | null | undefined, max: number | null | undefined): RangeBound => ({
    min: Math.floor(min ?? 0),
    max: Math.ceil(max ?? 0),
  })

  return {
    owners: owners.results ?? [],
    countries: (countries.results ?? []).map((r) => r.country),
    bounds: {
      altitudeKm: bound(bounds?.alt_min, bounds?.alt_max),
      inclinationDeg: bound(bounds?.inc_min, bounds?.inc_max),
      launchYear: bound(bounds?.year_min, bounds?.year_max),
    },
  }
}
