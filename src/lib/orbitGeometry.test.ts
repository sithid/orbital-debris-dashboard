import { describe, expect, it } from 'vitest'
import { orbitGeometry, orbitInstanceMatrix, orbitRotation } from './orbitGeometry'

const TOL = 1e-9

function distance(p: { x: number; y: number; z: number }): number {
  return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
}

// Apply a column-major 4×4 matrix to a point (w=1).
function applyMatrix(m: number[], p: { x: number; y: number; z: number }) {
  return {
    x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
    y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
    z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
  }
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

describe('orbitRotation', () => {
  it('is the identity matrix at i=0, raan=0, argp=0', () => {
    const R = orbitRotation({ i: 0 })
    expect(R.r11).toBeCloseTo(1, 9)
    expect(R.r22).toBeCloseTo(1, 9)
    expect(R.r33).toBeCloseTo(1, 9)
    expect(R.r12).toBeCloseTo(0, 9)
    expect(R.r21).toBeCloseTo(0, 9)
    expect(R.r13).toBeCloseTo(0, 9)
    expect(R.r31).toBeCloseTo(0, 9)
  })

  it('is orthonormal (columns are unit length and mutually perpendicular)', () => {
    const R = orbitRotation({ i: 37, raan: 110, argp: 64 })
    const c0 = [R.r11, R.r21, R.r31]
    const c1 = [R.r12, R.r22, R.r32]
    const c2 = [R.r13, R.r23, R.r33]
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    expect(dot(c0, c0)).toBeCloseTo(1, 9)
    expect(dot(c1, c1)).toBeCloseTo(1, 9)
    expect(dot(c2, c2)).toBeCloseTo(1, 9)
    expect(dot(c0, c1)).toBeCloseTo(0, 9)
    expect(dot(c0, c2)).toBeCloseTo(0, 9)
    expect(dot(c1, c2)).toBeCloseTo(0, 9)
  })

  it('tilts the orbit-plane normal by the inclination at i=90 (polar)', () => {
    // Plane normal is the third column; at i=90 it lies in the equatorial plane.
    const R = orbitRotation({ i: 90 })
    expect(R.r33).toBeCloseTo(0, 9)
  })
})

describe('orbitInstanceMatrix', () => {
  it('maps the unit circle to the correct perigee and apogee for an eccentric orbit', () => {
    const sma = 10
    const e = 0.5
    const m = orbitInstanceMatrix({ sma, e, i: 0 })

    // Base unit circle at θ=0 -> +x maps to perigee; θ=180 -> -x maps to apogee.
    const perigee = applyMatrix(m, { x: 1, y: 0, z: 0 })
    const apogee = applyMatrix(m, { x: -1, y: 0, z: 0 })

    expect(distance(perigee)).toBeCloseTo(sma * (1 - e), 6)
    expect(distance(apogee)).toBeCloseTo(sma * (1 + e), 6)
  })

  it('maps the unit circle to a circle of radius sma when e=0', () => {
    const sma = 7
    const m = orbitInstanceMatrix({ sma, e: 0, i: 0 })
    for (let deg = 0; deg < 360; deg += 30) {
      const t = (deg * Math.PI) / 180
      const p = applyMatrix(m, { x: Math.cos(t), y: Math.sin(t), z: 0 })
      expect(distance(p)).toBeCloseTo(sma, 6)
      expect(p.z).toBeCloseTo(0, TOL)
    }
  })

  it('spreads a polar orbit (i=90) onto the z-axis', () => {
    const m = orbitInstanceMatrix({ sma: 5, e: 0, i: 90 })
    const top = applyMatrix(m, { x: 0, y: 1, z: 0 })
    expect(Math.abs(top.z)).toBeCloseTo(5, 6)
  })
})
