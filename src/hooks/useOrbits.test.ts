import { describe, expect, it } from 'vitest'
import { buildOrbitsQuery, type OrbitsQuery } from './useOrbits'

const base: OrbitsQuery = {
  sample: 2000,
  seed: 1,
  search: '',
  objectType: '',
  orbitClass: '',
  ownerCode: '',
  country: '',
}

describe('buildOrbitsQuery', () => {
  it('always encodes sample and seed', () => {
    const params = new URLSearchParams(buildOrbitsQuery(base))
    expect(params.get('sample')).toBe('2000')
    expect(params.get('seed')).toBe('1')
  })

  it('omits empty filters', () => {
    const params = new URLSearchParams(buildOrbitsQuery(base))
    for (const key of ['search', 'objectType', 'orbitClass', 'ownerCode', 'country']) {
      expect(params.has(key)).toBe(false)
    }
  })

  it('includes filters that are set', () => {
    const params = new URLSearchParams(
      buildOrbitsQuery({
        ...base,
        search: 'STARLINK',
        objectType: 'PAYLOAD',
        orbitClass: 'LEO',
        ownerCode: 'SPX',
        country: 'USA',
      })
    )
    expect(params.get('search')).toBe('STARLINK')
    expect(params.get('objectType')).toBe('PAYLOAD')
    expect(params.get('orbitClass')).toBe('LEO')
    expect(params.get('ownerCode')).toBe('SPX')
    expect(params.get('country')).toBe('USA')
  })

  it('produces a stable string for the same query (drives refetch keying)', () => {
    const q: OrbitsQuery = { ...base, sample: 500, seed: 3, objectType: 'DEBRIS' }
    expect(buildOrbitsQuery(q)).toBe(buildOrbitsQuery({ ...q }))
  })
})
