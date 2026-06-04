import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, in_orbit INTEGER, object_name TEXT, object_type TEXT, owner_code TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, orbit_class TEXT, semi_major_axis_km REAL, eccentricity REAL, inclination_degrees REAL);'
  )
  await env.DB.exec(
    'CREATE TABLE ownership_operators (owner_code TEXT PRIMARY KEY, owner TEXT, country_operator TEXT);'
  )
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO ownership_operators (owner_code, owner, country_operator) VALUES ('US', 'United States Government', 'USA')"
    ),
    env.DB.prepare(
      "INSERT INTO ownership_operators (owner_code, owner, country_operator) VALUES ('PRC', 'China Aerospace', 'China')"
    ),
  ])

  // 200 in-orbit objects with usable geometry. Deterministic test fixtures:
  //   even id  -> orbit_class LEO, object_type PAYLOAD
  //   odd  id  -> orbit_class MEO, object_type DEBRIS
  //   id <= 50 -> owner US (USA), else PRC (China)
  const batch = []
  for (let id = 1; id <= 200; id++) {
    batch.push(
      env.DB.prepare(
        'INSERT INTO satellites (norad_id, in_orbit, object_name, object_type, owner_code) VALUES (?, 1, ?, ?, ?)'
      ).bind(id, `OBJECT ${id}`, id % 2 === 0 ? 'PAYLOAD' : 'DEBRIS', id <= 50 ? 'US' : 'PRC')
    )
    batch.push(
      env.DB.prepare(
        'INSERT INTO orbital_data (norad_id, orbit_class, semi_major_axis_km, eccentricity, inclination_degrees) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, id % 2 === 0 ? 'LEO' : 'MEO', 7000 + id, 0.01 * (id % 10), id % 90)
    )
  }
  // Row 999: null sma — should be filtered out
  batch.push(
    env.DB.prepare(
      "INSERT INTO satellites (norad_id, in_orbit, object_name, object_type, owner_code) VALUES (999, 1, 'NULL SMA', 'PAYLOAD', 'US')"
    )
  )
  batch.push(
    env.DB.prepare(
      'INSERT INTO orbital_data (norad_id, orbit_class, semi_major_axis_km, eccentricity, inclination_degrees) VALUES (999, ?, NULL, 0.01, 51.6)'
    ).bind('LEO')
  )
  // Row 1000: decayed (in_orbit=0) — excluded by default; included only when inOrbit=0
  batch.push(
    env.DB.prepare(
      "INSERT INTO satellites (norad_id, in_orbit, object_name, object_type, owner_code) VALUES (1000, 0, 'DECAYED', 'PAYLOAD', 'US')"
    )
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
    object_name: string | null
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
      object_name: expect.any(String),
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
    expect(body.sample).toBe(40000)
  })

  it('filters by objectType', async () => {
    const body = await fetchOrbits('?sample=10000&objectType=PAYLOAD&inOrbit=1')
    // PAYLOAD == even ids; 100 of them in 1..200
    expect(body.total).toBe(100)
    expect(body.orbits).toHaveLength(100)
    expect(body.orbits.every((o) => o.norad_id % 2 === 0)).toBe(true)
  })

  it('filters by orbitClass', async () => {
    const body = await fetchOrbits('?sample=10000&orbitClass=LEO')
    expect(body.total).toBe(100)
    expect(body.orbits.every((o) => o.orbit_class === 'LEO')).toBe(true)
  })

  it('filters by ownerCode', async () => {
    const body = await fetchOrbits('?sample=10000&ownerCode=US')
    // owner US == ids 1..50, all in-orbit with usable geometry
    expect(body.total).toBe(50)
    expect(body.orbits.every((o) => o.norad_id <= 50)).toBe(true)
  })

  it('combines filters with AND', async () => {
    // PAYLOAD (even) AND owner US (id<=50) -> ids 2,4,...,50 == 25 rows
    const body = await fetchOrbits('?sample=10000&objectType=PAYLOAD&ownerCode=US')
    expect(body.total).toBe(25)
  })

  it('defaults to in-orbit only, excluding decayed objects', async () => {
    const body = await fetchOrbits('?sample=10000')
    expect(body.total).toBe(200)
    expect(body.orbits.find((o) => o.norad_id === 1000)).toBeUndefined()
  })

  it('includes decayed objects when inOrbit=0', async () => {
    const body = await fetchOrbits('?sample=10000&inOrbit=0')
    // Only row 1000 is decayed and has usable geometry
    expect(body.total).toBe(1)
    expect(body.orbits[0].norad_id).toBe(1000)
  })

  it('treats all-digit search as an exact NORAD id match', async () => {
    const body = await fetchOrbits('?sample=10000&search=42')
    expect(body.total).toBe(1)
    expect(body.orbits[0].norad_id).toBe(42)
  })

  it('treats non-numeric search as a case-insensitive name substring', async () => {
    // "OBJECT 15" is a substring of OBJECT 15 and OBJECT 150..159 -> 11 rows.
    const body = await fetchOrbits('?sample=10000&search=object%2015')
    expect(body.total).toBe(11)
    expect(body.orbits.every((o) => o.object_name?.startsWith('OBJECT 15'))).toBe(true)
  })

  it('filters by operator country (JOIN ownership_operators)', async () => {
    const usa = await fetchOrbits('?sample=10000&country=USA')
    expect(usa.total).toBe(50) // owner US == ids 1..50
    expect(usa.orbits.every((o) => o.norad_id <= 50)).toBe(true)

    const china = await fetchOrbits('?sample=10000&country=China')
    expect(china.total).toBe(150) // owner PRC == ids 51..200
  })

  it('combines search and country with AND', async () => {
    // name "OBJECT 15" (11 rows: 15,150..159) AND country USA (id<=50) -> just 15
    const body = await fetchOrbits('?sample=10000&search=OBJECT%2015&country=USA')
    expect(body.total).toBe(1)
    expect(body.orbits[0].norad_id).toBe(15)
  })
})
