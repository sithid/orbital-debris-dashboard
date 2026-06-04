import { describe, expect, it } from 'vitest'
import { buildOrbitsQuery, type OrbitsQuery } from './useOrbits'
import { EMPTY_COMMON_FILTERS } from '../lib/filterParams'

const base: OrbitsQuery = {
  ...EMPTY_COMMON_FILTERS,
  sample: 2000,
  seed: 1,
}

describe('buildOrbitsQuery', () => {
  it('always encodes sample and seed', () => {
    const params = new URLSearchParams(buildOrbitsQuery(base))
    expect(params.get('sample')).toBe('2000')
    expect(params.get('seed')).toBe('1')
  })

  it('omits empty filters but includes set ones (via appendFilterParams)', () => {
    const params = new URLSearchParams(
      buildOrbitsQuery({ ...base, objectType: 'PAYLOAD', isZombie: '1' })
    )
    expect(params.get('objectType')).toBe('PAYLOAD')
    expect(params.get('isZombie')).toBe('1')
    expect(params.has('country')).toBe(false)
  })

  it('produces a stable string for the same query (drives refetch keying)', () => {
    const q: OrbitsQuery = { ...base, sample: 500, seed: 3, objectType: 'DEBRIS' }
    expect(buildOrbitsQuery(q)).toBe(buildOrbitsQuery({ ...q }))
  })
})
