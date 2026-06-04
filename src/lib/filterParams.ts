// The filter dimensions shared by the Objects table and the Globe. All values
// are strings ('' = unset) so the same controls and URL-serialization work for
// both pages. The API parses them (numbers for ranges, 0/1 for booleans).
export type CommonFilters = {
  search: string
  objectType: string
  orbitClass: string
  ownerCode: string
  country: string
  minAltKm: string
  maxAltKm: string
  minInc: string
  maxInc: string
  minYear: string
  maxYear: string
  isZombie: string // '', '0', '1'
  inOrbit: string // '', '0', '1', and (globe only) 'all'
}

export const EMPTY_COMMON_FILTERS: CommonFilters = {
  search: '',
  objectType: '',
  orbitClass: '',
  ownerCode: '',
  country: '',
  minAltKm: '',
  maxAltKm: '',
  minInc: '',
  maxInc: '',
  minYear: '',
  maxYear: '',
  isZombie: '',
  inOrbit: '',
}

const FILTER_KEYS = Object.keys(EMPTY_COMMON_FILTERS) as (keyof CommonFilters)[]

// Append every set filter to a URLSearchParams. Empty strings are omitted, so a
// query only carries the filters the user actually applied.
export function appendFilterParams(params: URLSearchParams, filters: Partial<CommonFilters>): void {
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
}

// True when any filter dimension is active — drives the "active filter" badge
// and whether Reset is enabled.
export function countActiveFilters(filters: Partial<CommonFilters>): number {
  return FILTER_KEYS.reduce((n, key) => (filters[key] ? n + 1 : n), 0)
}
