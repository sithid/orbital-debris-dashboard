export interface OrbitOwnerFacet {
  code: string
  name: string
}

export interface OrbitFacets {
  owners: OrbitOwnerFacet[]
  countries: string[]
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

  return {
    owners: owners.results ?? [],
    countries: (countries.results ?? []).map((r) => r.country),
  }
}
