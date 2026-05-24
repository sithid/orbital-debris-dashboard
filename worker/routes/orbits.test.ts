import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, in_orbit INTEGER);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, orbit_class TEXT, semi_major_axis_km REAL, eccentricity REAL, inclination_degrees REAL);'
  )

  const batch = []
  for (let id = 1; id <= 200; id++) {
    batch.push(
      env.DB.prepare('INSERT INTO satellites (norad_id, in_orbit) VALUES (?, 1)').bind(id)
    )
    batch.push(
      env.DB.prepare(
        'INSERT INTO orbital_data (norad_id, orbit_class, semi_major_axis_km, eccentricity, inclination_degrees) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, id % 2 === 0 ? 'LEO' : 'MEO', 7000 + id, 0.01 * (id % 10), id % 90)
    )
  }
  // Row 999: null sma — should be filtered out
  batch.push(
    env.DB.prepare('INSERT INTO satellites (norad_id, in_orbit) VALUES (999, 1)')
  )
  batch.push(
    env.DB.prepare(
      'INSERT INTO orbital_data (norad_id, orbit_class, semi_major_axis_km, eccentricity, inclination_degrees) VALUES (999, ?, NULL, 0.01, 51.6)'
    ).bind('LEO')
  )
  // Row 1000: decayed (in_orbit=0) — should be filtered out
  batch.push(
    env.DB.prepare('INSERT INTO satellites (norad_id, in_orbit) VALUES (1000, 0)')
  )
  batch.push(
    env.DB.prepare(
      'INSERT INTO orbital_data (norad_id, orbit_class, semi_major_axis_km, eccentricity, inclination_degrees) VALUES (1000, ?, 7000, 0.01, 51.6)'
    ).bind('LEO')
  )

  await env.DB.batch(batch)
})

type OrbitsResp = {
  orbits: Array<{
    norad_id: number
    sma_km: number
    eccentricity: number
    inclination_deg: number
    orbit_class: string | null
  }>
  sample: number
  seed: number
  total: number
}

async function fetchOrbits(query = ''): Promise<OrbitsResp> {
  const res = await SELF.fetch(`https://example.com/api/orbits${query}`)
  expect(res.status).toBe(200)
  return (await res.json()) as OrbitsResp
}

describe('GET /api/orbits', () => {
  it('returns the expected envelope shape', async () => {
    const body = await fetchOrbits('?sample=5')
    expect(body).toMatchObject({
      orbits: expect.any(Array),
      sample: 5,
      seed: 0,
      total: 200,
    })
    expect(body.orbits[0]).toMatchObject({
      norad_id: expect.any(Number),
      sma_km: expect.any(Number),
      eccentricity: expect.any(Number),
      inclination_deg: expect.any(Number),
    })
  })

  it('returns exactly N orbit records when sample=N', async () => {
    const body = await fetchOrbits('?sample=100')
    expect(body.orbits).toHaveLength(100)
  })

  it('is deterministic given the same seed', async () => {
    const a = await fetchOrbits('?sample=50&seed=42')
    const b = await fetchOrbits('?sample=50&seed=42')
    expect(a.orbits.map((o) => o.norad_id)).toEqual(b.orbits.map((o) => o.norad_id))
  })

  it('different seeds return different orderings', async () => {
    const a = await fetchOrbits('?sample=50&seed=1')
    const b = await fetchOrbits('?sample=50&seed=999')
    expect(a.orbits.map((o) => o.norad_id)).not.toEqual(
      b.orbits.map((o) => o.norad_id)
    )
  })

  it('filters out rows with null orbital params and decayed objects', async () => {
    const body = await fetchOrbits('?sample=10000')
    expect(body.total).toBe(200)
    expect(body.orbits).toHaveLength(200)
    expect(body.orbits.find((o) => o.norad_id === 999)).toBeUndefined()
    expect(body.orbits.find((o) => o.norad_id === 1000)).toBeUndefined()
  })

  it('clamps oversized sample to MAX_SAMPLE', async () => {
    const body = await fetchOrbits('?sample=99999')
    expect(body.sample).toBe(10000)
  })
})
