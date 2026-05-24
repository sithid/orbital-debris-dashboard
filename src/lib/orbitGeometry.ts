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
 * Convert Keplerian orbital elements to a closed loop of 3D points in an
 * inertial frame. The ellipse lies in the orbital plane (perifocal frame),
 * then is rotated by argp → inclination → RAAN to place it in the parent
 * frame (Earth-centered for this app).
 *
 * Note: RAAN and argp have no astronomical meaning for this dashboard — they
 * are randomized at render time and only exist to spread orbits visually.
 */
export function orbitGeometry(p: OrbitParams): Vec3[] {
  const segments = p.segments ?? 64
  const a = p.sma
  const e = p.e
  const iRad = (p.i * Math.PI) / 180
  const raanRad = ((p.raan ?? 0) * Math.PI) / 180
  const argpRad = ((p.argp ?? 0) * Math.PI) / 180

  const cosO = Math.cos(raanRad)
  const sinO = Math.sin(raanRad)
  const cosI = Math.cos(iRad)
  const sinI = Math.sin(iRad)
  const cosw = Math.cos(argpRad)
  const sinw = Math.sin(argpRad)

  // Rotation matrix R = Rz(Ω) · Rx(i) · Rz(ω) applied to perifocal vectors.
  const r11 = cosO * cosw - sinO * sinw * cosI
  const r12 = -cosO * sinw - sinO * cosw * cosI
  const r21 = sinO * cosw + cosO * sinw * cosI
  const r22 = -sinO * sinw + cosO * cosw * cosI
  const r31 = sinw * sinI
  const r32 = cosw * sinI

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
