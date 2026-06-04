// Shared filter logic for /api/objects and /api/orbits so the table and the
// globe agree on what every filter means. Each predicate references a fixed
// table alias: s=satellites, o=orbital_data, op=ownership_operators,
// le=launch_events, ra=risk_assessment. Callers must use these aliases and
// emit the optional joins reported in `needs` (see optionalJoins).

export interface FilterNeeds {
  ownership: boolean
  launch: boolean
  risk: boolean
}

export interface CommonFilters {
  clauses: string[]
  bindings: unknown[]
  needs: FilterNeeds
}

// Returns a finite number or null. A bad/empty range bound simply drops that
// side of the filter rather than erroring.
export function parseFiniteNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Pushes `minColumn >= min` / `maxColumn <= max` for whichever bounds are set.
function addRange(
  clauses: string[],
  bindings: unknown[],
  minColumn: string,
  minValue: number | null,
  maxColumn: string,
  maxValue: number | null
): void {
  if (minValue !== null) {
    clauses.push(`${minColumn} >= ?`)
    bindings.push(minValue)
  }
  if (maxValue !== null) {
    clauses.push(`${maxColumn} <= ?`)
    bindings.push(maxValue)
  }
}

/**
 * Build the WHERE predicates + bindings shared by the objects and orbits APIs.
 * `inOrbit` is only applied when the param is present — each route supplies its
 * own default (the globe defaults to in-orbit; the table defaults to all).
 */
export function applyCommonFilters(params: URLSearchParams): CommonFilters {
  const clauses: string[] = []
  const bindings: unknown[] = []
  const needs: FilterNeeds = { ownership: false, launch: false, risk: false }

  // Name/NORAD search: all-digit input is an exact NORAD id; anything else is a
  // case-insensitive name substring.
  const search = params.get('search')?.trim()
  if (search) {
    if (/^\d+$/.test(search)) {
      clauses.push('s.norad_id = ?')
      bindings.push(Number.parseInt(search, 10))
    } else {
      clauses.push('UPPER(s.object_name) LIKE ?')
      bindings.push(`%${search.toUpperCase()}%`)
    }
  }

  const objectType = params.get('objectType')
  if (objectType) {
    clauses.push('s.object_type = ?')
    bindings.push(objectType)
  }

  const orbitClass = params.get('orbitClass')
  if (orbitClass) {
    clauses.push('o.orbit_class = ?')
    bindings.push(orbitClass)
  }

  const ownerCode = params.get('ownerCode')
  if (ownerCode) {
    clauses.push('s.owner_code = ?')
    bindings.push(ownerCode)
  }

  const country = params.get('country')
  if (country) {
    clauses.push('op.country_operator = ?')
    bindings.push(country)
    needs.ownership = true
  }

  // Altitude band — containment: the whole orbit sits within [min, max], i.e.
  // perigee >= minAlt and apogee <= maxAlt.
  addRange(
    clauses,
    bindings,
    'o.perigee_km',
    parseFiniteNumber(params.get('minAltKm')),
    'o.apogee_km',
    parseFiniteNumber(params.get('maxAltKm'))
  )

  // Inclination range.
  addRange(
    clauses,
    bindings,
    'o.inclination_degrees',
    parseFiniteNumber(params.get('minInc')),
    'o.inclination_degrees',
    parseFiniteNumber(params.get('maxInc'))
  )

  // Launch-year range (resolved through launch_events).
  const minYear = parseFiniteNumber(params.get('minYear'))
  const maxYear = parseFiniteNumber(params.get('maxYear'))
  if (minYear !== null || maxYear !== null) {
    addRange(clauses, bindings, 'le.launch_year', minYear, 'le.launch_year', maxYear)
    needs.launch = true
  }

  // Zombie status (risk_assessment.is_zombie). Only 0/1 are honoured.
  const isZombie = params.get('isZombie')
  if (isZombie === '0' || isZombie === '1') {
    clauses.push('ra.is_zombie = ?')
    bindings.push(Number.parseInt(isZombie, 10))
    needs.risk = true
  }

  // in_orbit — only when explicitly requested; route supplies any default.
  const inOrbit = params.get('inOrbit')
  if (inOrbit === '0' || inOrbit === '1') {
    clauses.push('s.in_orbit = ?')
    bindings.push(Number.parseInt(inOrbit, 10))
  }

  return { clauses, bindings, needs }
}

// Optional LEFT JOINs, emitted only when a filter actually needs them.
export function optionalJoins(needs: FilterNeeds): string {
  const joins: string[] = []
  if (needs.ownership) {
    joins.push('LEFT JOIN ownership_operators op ON op.owner_code = s.owner_code')
  }
  if (needs.launch) {
    joins.push('LEFT JOIN launch_events le ON le.launch_id = s.launch_id')
  }
  if (needs.risk) {
    joins.push('LEFT JOIN risk_assessment ra ON ra.norad_id = s.norad_id')
  }
  return joins.length ? '\n    ' + joins.join('\n    ') : ''
}
