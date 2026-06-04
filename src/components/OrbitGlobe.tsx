import { useEffect, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Raycaster,
  TorusGeometry,
  Vector2,
} from 'three'
import { orbitInstanceMatrix } from '../lib/orbitGeometry'
import { noradForInstance, screenToNdc } from '../lib/orbitPicking'
import type { OrbitDatum } from '../hooks/useOrbits'

export type { OrbitDatum }

type Props = {
  orbits: OrbitDatum[]
  onHover?: (orbit: OrbitDatum | null) => void
  onSelect?: (orbit: OrbitDatum) => void
}

const EARTH_RADIUS_KM = 6371
// react-globe.gl renders Earth as a sphere of radius 100 in scene units.
const GLOBE_RADIUS = 100
const KM_TO_GLOBE = GLOBE_RADIUS / EARTH_RADIUS_KM

// Altitude above Earth's surface is exaggerated so the LEO shell isn't
// visually crammed against the globe. Standard orbit-viz convention.
const ALTITUDE_EXAGGERATION = 2.5

// Tube radius in the unit-circle base geometry. The per-orbit transform scales
// it with the orbit, so every shell reads as a proportionally thin hairline —
// big GEO rings and tight LEO rings both look like fine lines.
const TUBE_RADIUS = 0.005

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

// Mulberry32 — deterministic PRNG seeded per orbit so RAAN/argp don't reshuffle
// between renders.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build one InstancedMesh holding every orbit as an instance of a thin
 * elliptical torus. One draw call regardless of orbit count — this is what
 * lets the globe scale from ~2k (Phase 5) to the full ~34k candidate set.
 */
function buildOrbitMesh(orbits: OrbitDatum[]): InstancedMesh {
  const base = new TorusGeometry(1, TUBE_RADIUS, 3, 96)
  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })
  const mesh = new InstancedMesh(base, material, orbits.length)
  // GEO rings extend far past the globe; skip whole-mesh frustum culling so the
  // mesh always renders and stays raycastable.
  mesh.frustumCulled = false

  const matrix = new Matrix4()
  const color = new Color()
  for (let i = 0; i < orbits.length; i++) {
    const d = orbits[i]
    const rng = mulberry32(d.norad_id)
    const raan = rng() * 360
    const argp = rng() * 360
    const elements = orbitInstanceMatrix({
      sma: effectiveSmaKm(d.sma_km) * KM_TO_GLOBE,
      e: d.eccentricity,
      i: d.inclination_deg,
      raan,
      argp,
    })
    matrix.fromArray(elements)
    mesh.setMatrixAt(i, matrix)
    color.set(colorFor(d.orbit_class))
    mesh.setColorAt(i, color)
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return mesh
}

function disposeMesh(mesh: InstancedMesh): void {
  mesh.geometry.dispose()
  const material = mesh.material
  if (Array.isArray(material)) material.forEach((m) => m.dispose())
  else material.dispose()
  mesh.dispose()
}

export function OrbitGlobe({ orbits, onHover, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const meshRef = useRef<InstancedMesh | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [globeReady, setGlobeReady] = useState(false)

  // Keep the latest hover/select handlers without re-binding pointer listeners.
  const onHoverRef = useRef(onHover)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onHoverRef.current = onHover
    onSelectRef.current = onSelect
  })

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
    if (!globeReady || !globeRef.current) return
    globeRef.current.pointOfView({ altitude: 8 }, 0)
  }, [globeReady])

  // (Re)build the instanced orbit mesh whenever the data changes (filters,
  // sample size). The previous mesh is removed and disposed to avoid leaks.
  useEffect(() => {
    if (!globeReady || !globeRef.current) return
    const scene = globeRef.current.scene()
    const mesh = buildOrbitMesh(orbits)
    meshRef.current = mesh
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      meshRef.current = null
      disposeMesh(mesh)
    }
  }, [orbits, globeReady])

  // Picking: raycast the instanced mesh on pointer move (throttled) and click.
  // globe.gl's onCustomLayer* events don't surface instanceId, so we run our
  // own raycaster against the globe's camera + canvas.
  useEffect(() => {
    if (!globeReady || !globeRef.current) return
    const renderer = globeRef.current.renderer()
    const camera = globeRef.current.camera()
    const dom = renderer.domElement
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    let rafId = 0
    let hoveredId: number | null = null

    function pick(clientX: number, clientY: number): OrbitDatum | null {
      const mesh = meshRef.current
      if (!mesh) return null
      const rect = dom.getBoundingClientRect()
      const ndc = screenToNdc(clientX - rect.left, clientY - rect.top, rect.width, rect.height)
      pointer.set(ndc.x, ndc.y)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(mesh, false)[0]
      const norad = noradForInstance(orbits, hit?.instanceId)
      if (norad == null || hit?.instanceId == null) return null
      return orbits[hit.instanceId]
    }

    function handleMove(ev: PointerEvent) {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        const orbit = pick(ev.clientX, ev.clientY)
        const id = orbit?.norad_id ?? null
        if (id !== hoveredId) {
          hoveredId = id
          dom.style.cursor = orbit ? 'pointer' : ''
          onHoverRef.current?.(orbit)
        }
      })
    }

    function handleClick(ev: MouseEvent) {
      const orbit = pick(ev.clientX, ev.clientY)
      if (orbit) onSelectRef.current?.(orbit)
    }

    dom.addEventListener('pointermove', handleMove)
    dom.addEventListener('click', handleClick)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      dom.removeEventListener('pointermove', handleMove)
      dom.removeEventListener('click', handleClick)
      dom.style.cursor = ''
    }
  }, [orbits, globeReady])

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
          onGlobeReady={() => setGlobeReady(true)}
        />
      )}
    </div>
  )
}
