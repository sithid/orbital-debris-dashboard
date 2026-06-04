import { describe, expect, it } from 'vitest'
import {
  appendFilterParams,
  countActiveFilters,
  EMPTY_COMMON_FILTERS,
} from './filterParams'

describe('appendFilterParams', () => {
  it('omits every empty filter', () => {
    const params = new URLSearchParams()
    appendFilterParams(params, EMPTY_COMMON_FILTERS)
    expect(params.toString()).toBe('')
  })

  it('appends only the set filters', () => {
    const params = new URLSearchParams()
    appendFilterParams(params, {
      ...EMPTY_COMMON_FILTERS,
      search: 'STARLINK',
      country: 'USA',
      minAltKm: '500',
      maxAltKm: '600',
      isZombie: '1',
      inOrbit: '0',
    })
    expect(params.get('search')).toBe('STARLINK')
    expect(params.get('country')).toBe('USA')
    expect(params.get('minAltKm')).toBe('500')
    expect(params.get('maxAltKm')).toBe('600')
    expect(params.get('isZombie')).toBe('1')
    expect(params.get('inOrbit')).toBe('0')
    expect(params.has('objectType')).toBe(false)
  })
})

describe('countActiveFilters', () => {
  it('is 0 for the empty set', () => {
    expect(countActiveFilters(EMPTY_COMMON_FILTERS)).toBe(0)
  })

  it('counts each set dimension', () => {
    expect(
      countActiveFilters({ ...EMPTY_COMMON_FILTERS, ownerCode: 'SPX', isZombie: '1', minYear: '2020' })
    ).toBe(3)
  })
})
