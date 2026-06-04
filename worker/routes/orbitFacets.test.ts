import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, in_orbit INTEGER, object_name TEXT, owner_code TEXT, launch_id TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, semi_major_axis_km REAL, eccentricity REAL, inclination_degrees REAL, perigee_km REAL, apogee_km REAL);'
  )
  await env.DB.exec(
    'CREATE TABLE ownership_operators (owner_code TEXT PRIMARY KEY, owner TEXT, country_operator TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE launch_events (launch_id TEXT PRIMARY KEY, launch_year INTEGER);'
  )

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO ownership_operators VALUES ('US', 'United States Government', 'USA')"
    ),
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('PRC', 'China Aerospace', 'China')"),
    // Owner that only appears on an excluded (decayed) object — must NOT surface.
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('XX', 'Narnia Space', 'Narnia')"),
    // Upstream placeholder: owner literally "owner" — display should fall back to code.
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('NICO', 'owner', NULL)"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('LA', 2010)"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('LB', 2015)"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('LC', 2022)"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('LD', 1990)"),
  ])

  // Candidates 1,2,4 define the bounds: perigee 350..(min), apogee ..800 (max),
  // inclination 51..55, launch year 2010..2022. Decayed row 3 (apogee 9999,
  // year 1990) must NOT leak into the bounds.
  const batch = [
    env.DB.prepare("INSERT INTO satellites VALUES (1, 1, 'ALPHA', 'US', 'LA')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (1, 7000, 0.01, 51, 400, 500)'),
    env.DB.prepare("INSERT INTO satellites VALUES (2, 1, 'BETA', 'PRC', 'LB')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (2, 7200, 0.02, 53, 600, 800)'),
    // Candidate whose operator's owner name is the placeholder "owner".
    env.DB.prepare("INSERT INTO satellites VALUES (4, 1, 'NICO-SAT', 'NICO', 'LC')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (4, 7300, 0.01, 55, 350, 450)'),
    // Decayed object owned by XX — excluded from the candidate set.
    env.DB.prepare("INSERT INTO satellites VALUES (3, 0, 'GONE', 'XX', 'LD')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (3, 7100, 0.01, 90, 100, 9999)'),
  ]
  await env.DB.batch(batch)
})

type RangeBound = { min: number; max: number }
type Facets = {
  owners: Array<{ code: string; name: string }>
  countries: string[]
  bounds: {
    altitudeKm: RangeBound
    inclinationDeg: RangeBound
    launchYear: RangeBound
  }
}

describe('GET /api/orbits/facets', () => {
  it('returns distinct owners (sorted by name) present in the candidate set', async () => {
    const res = await SELF.fetch('https://example.com/api/orbits/facets')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Facets

    expect(body.owners).toEqual([
      { code: 'PRC', name: 'China Aerospace' },
      { code: 'NICO', name: 'NICO' }, // placeholder "owner" -> falls back to code
      { code: 'US', name: 'United States Government' },
    ])
  })

  it('falls back to owner_code when the owner name is the placeholder "owner"', async () => {
    const res = await SELF.fetch('https://example.com/api/orbits/facets')
    const body = (await res.json()) as Facets
    const nico = body.owners.find((o) => o.code === 'NICO')
    expect(nico?.name).toBe('NICO')
    // The junk placeholder must never be shown as a label.
    expect(body.owners.some((o) => o.name.toLowerCase() === 'owner')).toBe(false)
  })

  it('returns distinct operator countries (sorted)', async () => {
    const res = await SELF.fetch('https://example.com/api/orbits/facets')
    const body = (await res.json()) as Facets
    expect(body.countries).toEqual(['China', 'USA'])
  })

  it('excludes owners/countries that only appear on non-candidate objects', async () => {
    const res = await SELF.fetch('https://example.com/api/orbits/facets')
    const body = (await res.json()) as Facets
    expect(body.owners.find((o) => o.code === 'XX')).toBeUndefined()
    expect(body.countries).not.toContain('Narnia')
  })

  it('reports range bounds over the candidate set only', async () => {
    const res = await SELF.fetch('https://example.com/api/orbits/facets')
    const body = (await res.json()) as Facets
    // perigee min 350, apogee max 800 — the decayed row's apogee 9999 is excluded.
    expect(body.bounds.altitudeKm).toEqual({ min: 350, max: 800 })
    expect(body.bounds.inclinationDeg).toEqual({ min: 51, max: 55 })
    // launch year 2010..2022 — the decayed row's 1990 is excluded.
    expect(body.bounds.launchYear).toEqual({ min: 2010, max: 2022 })
  })
})
