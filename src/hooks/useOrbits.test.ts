import { describe, expect, it } from 'vitest'
import { buildOrbitsQuery } from './useOrbits'

describe('buildOrbitsQuery', () => {
  it('always encodes sample and seed', () => {
    const qs = buildOrbitsQuery({ sample: 2000, seed: 1, objectType: '', orbitClass: '' })
    const params = new URLSearchParams(qs)
    expect(params.get('sample')).toBe('2000')
    expect(params.get('seed')).toBe('1')
  })

  it('omits empty filters', () => {
    const qs = buildOrbitsQuery({ sample: 100, seed: 0, objectType: '', orbitClass: '' })
    const params = new URLSearchParams(qs)
    expect(params.has('objectType')).toBe(false)
    expect(params.has('orbitClass')).toBe(false)
  })

  it('includes filters that are set', () => {
    const qs = buildOrbitsQuery({
      sample: 100,
      seed: 0,
      objectType: 'PAYLOAD',
      orbitClass: 'LEO',
    })
    const params = new URLSearchParams(qs)
    expect(params.get('objectType')).toBe('PAYLOAD')
    expect(params.get('orbitClass')).toBe('LEO')
  })

  it('produces a stable string for the same query (drives refetch keying)', () => {
    const q = { sample: 500, seed: 3, objectType: 'DEBRIS', orbitClass: '' }
    expect(buildOrbitsQuery(q)).toBe(buildOrbitsQuery({ ...q }))
  })
})
