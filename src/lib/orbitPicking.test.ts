import { describe, expect, it } from 'vitest'
import { noradForInstance, screenToNdc } from './orbitPicking'

describe('screenToNdc', () => {
  it('maps the canvas center to the origin', () => {
    expect(screenToNdc(400, 300, 800, 600)).toEqual({ x: 0, y: 0 })
  })

  it('maps the top-left corner to (-1, +1)', () => {
    expect(screenToNdc(0, 0, 800, 600)).toEqual({ x: -1, y: 1 })
  })

  it('maps the bottom-right corner to (+1, -1)', () => {
    expect(screenToNdc(800, 600, 800, 600)).toEqual({ x: 1, y: -1 })
  })
})

describe('noradForInstance', () => {
  const orbits = [{ norad_id: 25544 }, { norad_id: 43013 }, { norad_id: 48274 }]

  it('resolves an instanceId to the matching NORAD id', () => {
    expect(noradForInstance(orbits, 0)).toBe(25544)
    expect(noradForInstance(orbits, 2)).toBe(48274)
  })

  it('returns null for a missing or out-of-range instanceId', () => {
    expect(noradForInstance(orbits, null)).toBeNull()
    expect(noradForInstance(orbits, undefined)).toBeNull()
    expect(noradForInstance(orbits, -1)).toBeNull()
    expect(noradForInstance(orbits, 3)).toBeNull()
  })
})
