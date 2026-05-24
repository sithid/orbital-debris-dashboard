import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
} from 'three'
import { orbitGeometry } from '../lib/orbitGeometry'

export type OrbitDatum = {
  norad_id: number
  sma_km: number
  eccentricity: number
  inclination_deg: number
  orbit_class: string | null
}

type Props = {
  orbits: OrbitDatum[]
}

const EARTH_RADIUS_KM = 6371
// react-globe.gl renders Earth as a sphere of radius 100 in scene units.
const GLOBE_RADIUS = 100
const KM_TO_GLOBE = GLOBE_RADIUS / EARTH_RADIUS_KM

// Altitude above Earth's surface is exaggerated so the LEO shell isn't
// visually crammed against the globe. Standard orbit-viz convention.
const ALTITUDE_EXAGGERATION = 2.5

function effectiveSmaKm(smaKm: number): number {
  const altitudeKm = Math.max(0, smaKm - EARTH_RADIUS_KM)
  return EARTH_RADIUS_KM + altitudeKm * ALTITUDE_EXAGGERATION
}

// Hue map per orbit class, matching the DESIGN.md status palette spirit.
const ORBIT_CLASS_COLOR: Record<string, string> = {
  LEO: '#38bdf8', // cyan
  MEO: '#fbbf24', // gold
  GEO: '#22c55e', // success green
  HEO: '#a78bfa', // violet (extra band, no design token)
  IGO: '#a78bfa',
  EGO: '#22c55e',
}
const DEFAULT_ORBIT_COLOR = '#94a3b8'

function colorFor(orbitClass: string | null | undefined): string {
  if (!orbitClass) return DEFAULT_ORBIT_COLOR
  return ORBIT_CLASS_COLOR[orbitClass.toUpperCase()] ?? DEFAULT_ORBIT_COLOR
}

// Mulberry32 — deterministic PRNG seeded per orbit so RAAN/argp don't
// reshuffle between renders.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildOrbitLine(d: OrbitDatum): Line {
  const rng = mulberry32(d.norad_id)
  const raan = rng() * 360
  const argp = rng() * 360

  const points = orbitGeometry({
    sma: effectiveSmaKm(d.sma_km) * KM_TO_GLOBE,
    e: d.eccentricity,
    i: d.inclination_deg,
    raan,
    argp,
    segments: 96,
  })

  const positions = new Float32Array(points.length * 3)
  for (let k = 0; k < points.length; k++) {
    positions[k * 3] = points[k].x
    positions[k * 3 + 1] = points[k].y
    positions[k * 3 + 2] = points[k].z
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))

  const material = new LineBasicMaterial({
    color: colorFor(d.orbit_class),
    transparent: true,
    opacity: 0.45,
  })
  return new Line(geometry, material)
}

export function OrbitGlobe({ orbits }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Track container size so the globe fills the available space responsively.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Pull the camera back so larger (GEO) orbits are visible on first load.
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.pointOfView({ altitude: 8 }, 0)
  }, [])

  // Stable reference for customLayerData — react-globe.gl re-renders the layer
  // on identity changes.
  const customData = useMemo(() => orbits as unknown as object[], [orbits])

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.width > 0 && size.height > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="#0f172a"
          showAtmosphere
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.18}
          globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
          customLayerData={customData}
          customThreeObject={(d) => buildOrbitLine(d as OrbitDatum)}
        />
      )}
    </div>
  )
}
