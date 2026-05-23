import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, object_name TEXT, object_type TEXT, ops_status TEXT, in_orbit INTEGER, owner_code TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, orbit_class TEXT);'
  )

  const rows: Array<[number, string, string, string, number, string, string]> = [
    [1, 'STARLINK-1', 'PAYLOAD', 'OPERATIONAL', 1, 'SPX', 'LEO'],
    [2, 'STARLINK-2', 'PAYLOAD', 'OPERATIONAL', 1, 'SPX', 'LEO'],
    [3, 'ATLAS DEB', 'DEBRIS', 'NONOP', 1, 'US', 'LEO'],
    [4, 'COSMOS 1408 DEB', 'DEBRIS', 'NONOP', 1, 'CIS', 'LEO'],
    [5, 'ZARYA', 'PAYLOAD', 'OPERATIONAL', 1, 'CIS', 'LEO'],
    [6, 'OLD ROCKET BODY', 'ROCKET BODY', 'NONOP', 0, 'US', 'UNKNOWN'],
    [25544, 'ISS (ZARYA)', 'PAYLOAD', 'OPERATIONAL', 1, 'ISS', 'LEO'],
  ]

  await env.DB.batch(
    rows.flatMap(([id, name, type, ops, inOrbit, owner, orbit]) => [
      env.DB.prepare(
        'INSERT INTO satellites (norad_id, object_name, object_type, ops_status, in_orbit, owner_code) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, name, type, ops, inOrbit, owner),
      env.DB.prepare(
        'INSERT INTO orbital_data (norad_id, orbit_class) VALUES (?, ?)'
      ).bind(id, orbit),
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
})
