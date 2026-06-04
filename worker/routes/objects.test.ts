import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

type Row = {
  id: number
  name: string
  type: string
  ops: string
  inOrbit: number
  owner: string
  orbit: string
  launch: string
  peri: number
  apo: number
  inc: number
  zombie: number
}

const ROWS: Row[] = [
  { id: 1, name: 'STARLINK-1', type: 'PAYLOAD', ops: 'OPERATIONAL', inOrbit: 1, owner: 'SPX', orbit: 'LEO', launch: 'L2020', peri: 540, apo: 560, inc: 53, zombie: 0 },
  { id: 2, name: 'STARLINK-2', type: 'PAYLOAD', ops: 'OPERATIONAL', inOrbit: 1, owner: 'SPX', orbit: 'LEO', launch: 'L2020', peri: 545, apo: 555, inc: 53, zombie: 0 },
  { id: 3, name: 'ATLAS DEB', type: 'DEBRIS', ops: 'NONOP', inOrbit: 1, owner: 'US', orbit: 'LEO', launch: 'L2000', peri: 400, apo: 420, inc: 51, zombie: 1 },
  { id: 4, name: 'COSMOS 1408 DEB', type: 'DEBRIS', ops: 'NONOP', inOrbit: 1, owner: 'CIS', orbit: 'LEO', launch: 'L2000', peri: 480, apo: 520, inc: 82, zombie: 1 },
  { id: 5, name: 'ZARYA', type: 'PAYLOAD', ops: 'OPERATIONAL', inOrbit: 1, owner: 'CIS', orbit: 'LEO', launch: 'L2000', peri: 410, apo: 430, inc: 51, zombie: 0 },
  { id: 6, name: 'OLD ROCKET BODY', type: 'ROCKET BODY', ops: 'NONOP', inOrbit: 0, owner: 'US', orbit: 'UNKNOWN', launch: 'L2000', peri: 200, apo: 35000, inc: 25, zombie: 0 },
  { id: 25544, name: 'ISS (ZARYA)', type: 'PAYLOAD', ops: 'OPERATIONAL', inOrbit: 1, owner: 'ISS', orbit: 'LEO', launch: 'L2020', peri: 410, apo: 420, inc: 51.6, zombie: 0 },
]

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, object_name TEXT, object_type TEXT, ops_status TEXT, in_orbit INTEGER, owner_code TEXT, launch_id TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, orbit_class TEXT, perigee_km REAL, apogee_km REAL, inclination_degrees REAL);'
  )
  await env.DB.exec(
    'CREATE TABLE ownership_operators (owner_code TEXT PRIMARY KEY, owner TEXT, country_operator TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE launch_events (launch_id TEXT PRIMARY KEY, launch_year INTEGER);'
  )
  await env.DB.exec(
    'CREATE TABLE risk_assessment (norad_id INTEGER PRIMARY KEY, is_zombie INTEGER);'
  )

  await env.DB.batch([
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('SPX', 'SpaceX', 'USA')"),
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('US', 'US Government', 'USA')"),
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('CIS', 'Roscosmos', 'Russia')"),
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('ISS', 'ISS Partners', 'International')"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('L2020', 2020)"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('L2000', 2000)"),
  ])

  await env.DB.batch(
    ROWS.flatMap((r) => [
      env.DB.prepare(
        'INSERT INTO satellites (norad_id, object_name, object_type, ops_status, in_orbit, owner_code, launch_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(r.id, r.name, r.type, r.ops, r.inOrbit, r.owner, r.launch),
      env.DB.prepare(
        'INSERT INTO orbital_data (norad_id, orbit_class, perigee_km, apogee_km, inclination_degrees) VALUES (?, ?, ?, ?, ?)'
      ).bind(r.id, r.orbit, r.peri, r.apo, r.inc),
      env.DB.prepare('INSERT INTO risk_assessment (norad_id, is_zombie) VALUES (?, ?)').bind(
        r.id,
        r.zombie
      ),
    ])
  )
})

type ObjectsResponse = {
  total: number
  page: number
  pageSize: number
  data: Array<{
    norad_id: number
    object_name: string | null
    object_type: string | null
    ops_status: string | null
    orbit_class: string | null
    owner_code: string | null
    in_orbit: number | null
    is_zombie: number | null
  }>
}

async function fetchObjects(query = ''): Promise<ObjectsResponse> {
  const res = await SELF.fetch(`https://example.com/api/objects${query}`)
  expect(res.status).toBe(200)
  return (await res.json()) as ObjectsResponse
}

describe('GET /api/objects', () => {
  it('returns the expected envelope shape', async () => {
    const body = await fetchObjects()
    expect(body).toMatchObject({
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
      data: expect.any(Array),
    })
    expect(body.data[0]).toMatchObject({
      norad_id: expect.any(Number),
      object_name: expect.any(String),
    })
  })

  it('paginates with correct slice and total', async () => {
    const page1 = await fetchObjects('?page=1&pageSize=2')
    expect(page1.total).toBe(7)
    expect(page1.page).toBe(1)
    expect(page1.pageSize).toBe(2)
    expect(page1.data).toHaveLength(2)

    const page2 = await fetchObjects('?page=2&pageSize=2')
    expect(page2.data).toHaveLength(2)
    expect(page2.data[0].norad_id).not.toBe(page1.data[0].norad_id)
  })

  it('searches by object name (case-insensitive substring)', async () => {
    const body = await fetchObjects('?search=starlink')
    expect(body.total).toBe(2)
    expect(body.data.every((r) => r.object_name?.toUpperCase().includes('STARLINK'))).toBe(true)
  })

  it('searches by exact NORAD ID when search is numeric', async () => {
    const body = await fetchObjects('?search=25544')
    expect(body.total).toBe(1)
    expect(body.data[0].norad_id).toBe(25544)
  })

  it('sorts by column ascending and descending', async () => {
    const asc = await fetchObjects('?sort=norad_id&order=asc&pageSize=100')
    const desc = await fetchObjects('?sort=norad_id&order=desc&pageSize=100')
    expect(asc.data[0].norad_id).toBeLessThan(asc.data[asc.data.length - 1].norad_id)
    expect(desc.data[0].norad_id).toBeGreaterThan(desc.data[desc.data.length - 1].norad_id)
  })

  it('filters by objectType', async () => {
    const body = await fetchObjects('?objectType=DEBRIS&pageSize=100')
    expect(body.total).toBe(2)
    expect(body.data.every((r) => r.object_type === 'DEBRIS')).toBe(true)
  })

  it('filters by orbitClass', async () => {
    const body = await fetchObjects('?orbitClass=UNKNOWN&pageSize=100')
    expect(body.total).toBe(1)
    expect(body.data[0].orbit_class).toBe('UNKNOWN')
  })

  it('rejects an invalid sort column', async () => {
    const res = await SELF.fetch('https://example.com/api/objects?sort=drop_table')
    expect(res.status).toBe(400)
  })

  it('includes is_zombie in the response shape', async () => {
    const body = await fetchObjects('?search=ATLAS')
    expect(body.data[0].is_zombie).toBe(1)
  })

  it('filters by ownerCode', async () => {
    const body = await fetchObjects('?ownerCode=CIS&pageSize=100')
    expect(body.total).toBe(2) // ids 4, 5
    expect(body.data.every((r) => r.owner_code === 'CIS')).toBe(true)
  })

  it('filters by operator country (JOIN ownership_operators)', async () => {
    const body = await fetchObjects('?country=USA&pageSize=100')
    // SPX (1,2) + US (3,6) -> 4
    expect(body.total).toBe(4)
  })

  it('filters by altitude band (containment)', async () => {
    // apogee <= 600 excludes the rocket body (apogee 35000) -> 6 of 7
    const body = await fetchObjects('?maxAltKm=600&pageSize=100')
    expect(body.total).toBe(6)
    expect(body.data.find((r) => r.norad_id === 6)).toBeUndefined()
  })

  it('filters by inclination range', async () => {
    const body = await fetchObjects('?minInc=80&pageSize=100')
    expect(body.total).toBe(1) // COSMOS DEB, inc 82
    expect(body.data[0].norad_id).toBe(4)
  })

  it('filters by launch year (JOIN launch_events)', async () => {
    const body = await fetchObjects('?minYear=2020&pageSize=100')
    // L2020 == ids 1, 2, 25544
    expect(body.total).toBe(3)
  })

  it('filters by zombie status (JOIN risk_assessment)', async () => {
    const zombies = await fetchObjects('?isZombie=1&pageSize=100')
    expect(zombies.total).toBe(2) // ids 3, 4
    expect(zombies.data.every((r) => r.is_zombie === 1)).toBe(true)

    const nonZombies = await fetchObjects('?isZombie=0&pageSize=100')
    expect(nonZombies.total).toBe(5)
  })

  it('filters by in_orbit (default shows all)', async () => {
    const all = await fetchObjects('?pageSize=100')
    expect(all.total).toBe(7)

    const decayed = await fetchObjects('?inOrbit=0&pageSize=100')
    expect(decayed.total).toBe(1) // the rocket body
    expect(decayed.data[0].norad_id).toBe(6)

    const live = await fetchObjects('?inOrbit=1&pageSize=100')
    expect(live.total).toBe(6)
  })

  it('combines filters with AND', async () => {
    // country USA (1,2,3,6) AND in-orbit (excludes 6) -> 1,2,3
    const body = await fetchObjects('?country=USA&inOrbit=1&pageSize=100')
    expect(body.total).toBe(3)
  })
})
