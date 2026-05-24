import { describe, expect, it } from 'vitest'
import { orbitGeometry } from './orbitGeometry'

const TOL = 1e-9

function distance(p: { x: number; y: number; z: number }): number {
  return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
}

describe('orbitGeometry', () => {
  it('returns segments+1 points (closed loop)', () => {
    const pts = orbitGeometry({ sma: 1, e: 0, i: 0, segments: 32 })
    expect(pts).toHaveLength(33)
    // First and last points coincide (closed loop)
    expect(pts[0].x).toBeCloseTo(pts[32].x, 9)
    expect(pts[0].y).toBeCloseTo(pts[32].y, 9)
    expect(pts[0].z).toBeCloseTo(pts[32].z, 9)
  })

  it('e=0, i=0 produces a circle of radius sma in the xy plane', () => {
    const sma = 7000
    const pts = orbitGeometry({ sma, e: 0, i: 0, segments: 64 })
    for (const p of pts) {
      expect(distance(p)).toBeCloseTo(sma, 6)
      expect(p.z).toBeCloseTo(0, TOL)
    }
  })

  it('e=0.5, i=0 produces correct perigee and apogee distances', () => {
    const sma = 1
    const e = 0.5
    const pts = orbitGeometry({ sma, e, i: 0, segments: 360 })

    const dists = pts.map(distance)
    const min = Math.min(...dists)
    const max = Math.max(...dists)

    expect(min).toBeCloseTo(sma * (1 - e), 6) // perigee
    expect(max).toBeCloseTo(sma * (1 + e), 6) // apogee
    expect(max / min).toBeCloseTo((1 + e) / (1 - e), 6)

    // Still in xy plane
    for (const p of pts) expect(p.z).toBeCloseTo(0, TOL)
  })

  it('e=0, i=90 produces a polar orbit (z-axis spread, y≈0)', () => {
    const sma = 7000
    const pts = orbitGeometry({ sma, e: 0, i: 90, segments: 64 })

    for (const p of pts) {
      expect(distance(p)).toBeCloseTo(sma, 6)
      expect(p.y).toBeCloseTo(0, 1e-6)
    }

    const zs = pts.map((p) => p.z)
    expect(Math.max(...zs)).toBeCloseTo(sma, 6)
    expect(Math.min(...zs)).toBeCloseTo(-sma, 6)
  })

  it('RAAN rotates the orbital plane about the z-axis without changing radii', () => {
    const base = orbitGeometry({ sma: 1, e: 0, i: 45, raan: 0 })
    const rotated = orbitGeometry({ sma: 1, e: 0, i: 45, raan: 90 })

    expect(base).toHaveLength(rotated.length)
    for (let k = 0; k < base.length; k++) {
      expect(distance(base[k])).toBeCloseTo(distance(rotated[k]), 9)
    }
  })
})
