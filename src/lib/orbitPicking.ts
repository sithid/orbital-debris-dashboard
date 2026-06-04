// Pure helpers for translating a globe raycast hit back into an orbit.
// Kept free of three.js and the DOM so they're unit-testable in the worker pool.

/** Normalized device coordinates: x,y in [-1, 1], origin at the canvas center. */
export type Ndc = { x: number; y: number }

/**
 * Map a pointer position (CSS pixels, relative to the canvas top-left) to the
 * NDC space a `THREE.Raycaster` expects. Top-left is (−1, +1); bottom-right is
 * (+1, −1) — the y-axis is flipped because screen y grows downward.
 */
export function screenToNdc(
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): Ndc {
  return {
    x: (offsetX / width) * 2 - 1,
    y: -(offsetY / height) * 2 + 1,
  }
}

/**
 * Resolve an `InstancedMesh` `instanceId` to its NORAD id. Instances are placed
 * in the same order as the `orbits` array, so the instanceId is a direct index.
 * Returns null for a miss (null/undefined instanceId or out-of-range index) so
 * callers can treat "nothing under the cursor" uniformly.
 */
export function noradForInstance(
  orbits: ReadonlyArray<{ norad_id: number }>,
  instanceId: number | null | undefined
): number | null {
  if (instanceId == null || instanceId < 0 || instanceId >= orbits.length) {
    return null
  }
  return orbits[instanceId].norad_id
}
