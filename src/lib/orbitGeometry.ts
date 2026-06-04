export type OrbitParams = {
  /** Semi-major axis. Units in == units out. */
  sma: number
  /** Eccentricity in [0, 1). 0 = circle. */
  e: number
  /** Inclination in degrees (0 = equatorial, 90 = polar). */
  i: number
  /** Right ascension of ascending node, degrees. Default 0. */
  raan?: number
  /** Argument of perigee, degrees. Default 0. */
  argp?: number
  /** Number of segments around the ellipse. Default 64. */
  segments?: number
}

export type Vec3 = { x: number; y: number; z: number }

/**
 * The 3×3 rotation matrix R = Rz(Ω) · Rx(i) · Rz(ω) that maps perifocal
 * (orbital-plane) coordinates into the Earth-centered inertial frame.
 * Stored row-major (`rRC` = row R, column C).
 *
 * This is the single source of truth for orbit orientation, shared by the
 * point generator (`orbitGeometry`) and the instanced-mesh transform
 * (`orbitInstanceMatrix`). Note: RAAN and argp have no astronomical meaning
 * for this dashboard — they are randomized at render time only to spread
 * orbits visually.
 */
export type Rotation = {
  r11: number; r12: number; r13: number
  r21: number; r22: number; r23: number
  r31: number; r32: number; r33: number
}

export function orbitRotation(p: { i: number; raan?: number; argp?: number }): Rotation {
  const iRad = (p.i * Math.PI) / 180
  const raanRad = ((p.raan ?? 0) * Math.PI) / 180
  const argpRad = ((p.argp ?? 0) * Math.PI) / 180

  const cosO = Math.cos(raanRad)
  const sinO = Math.sin(raanRad)
  const cosI = Math.cos(iRad)
  const sinI = Math.sin(iRad)
  const cosw = Math.cos(argpRad)
  const sinw = Math.sin(argpRad)

  return {
    r11: cosO * cosw - sinO * sinw * cosI,
    r12: -cosO * sinw - sinO * cosw * cosI,
    r13: sinO * sinI,
    r21: sinO * cosw + cosO * sinw * cosI,
    r22: -sinO * sinw + cosO * cosw * cosI,
    r23: -cosO * sinI,
    r31: sinw * sinI,
    r32: cosw * sinI,
    r33: cosI,
  }
}

/**
 * Convert Keplerian orbital elements to a closed loop of 3D points in an
 * inertial frame. The ellipse lies in the orbital plane (perifocal frame),
 * then is rotated by argp → inclination → RAAN to place it in the parent
 * frame (Earth-centered for this app).
 */
export function orbitGeometry(p: OrbitParams): Vec3[] {
  const segments = p.segments ?? 64
  const a = p.sma
  const e = p.e
  const { r11, r12, r21, r22, r31, r32 } = orbitRotation(p)

  const points: Vec3[] = []
  const semiLatus = a * (1 - e * e)
  for (let s = 0; s <= segments; s++) {
    const theta = (2 * Math.PI * s) / segments
    const r = semiLatus / (1 + e * Math.cos(theta))
    const xpf = r * Math.cos(theta)
    const ypf = r * Math.sin(theta)
    points.push({
      x: r11 * xpf + r12 * ypf,
      y: r21 * xpf + r22 * ypf,
      z: r31 * xpf + r32 * ypf,
    })
  }
  return points
}

/**
 * The 4×4 affine transform (column-major, ready for `THREE.Matrix4.fromArray`)
 * that maps a unit circle in the XY plane onto this orbit's ellipse, with
 * Earth's center at the focus.
 *
 *   M = R(Ω,i,ω) · T(−c, 0, 0) · S(a, b, 1)
 *
 * where b = a·√(1−e²) is the semi-minor axis and c = a·e is the focus offset.
 * Scaling a unit circle is an affine map, so a single matrix per orbit lets
 * thousands of orbits render as one instanced draw call. The instanced base
 * geometry (a thin torus) is a closed loop, so unlike the perigee-anchored
 * point generator the start angle is irrelevant — only the traced curve matters.
 */
export function orbitInstanceMatrix(p: OrbitParams): number[] {
  const a = p.sma
  const e = p.e
  const b = a * Math.sqrt(Math.max(0, 1 - e * e))
  const c = a * e

  const R = orbitRotation(p)

  // Linear part = R · diag(a, b, 1): scale each rotation column.
  // Translation = R · (−c, 0, 0): focus offset along the perifocal x-axis.
  return [
    a * R.r11, a * R.r21, a * R.r31, 0, // column 0 (scaled x̂)
    b * R.r12, b * R.r22, b * R.r32, 0, // column 1 (scaled ŷ)
    R.r13, R.r23, R.r33, 0,             // column 2 (ẑ, unscaled)
    -c * R.r11, -c * R.r21, -c * R.r31, 1, // translation
  ]
}
