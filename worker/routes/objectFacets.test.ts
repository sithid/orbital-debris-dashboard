import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, in_orbit INTEGER, owner_code TEXT, launch_id TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, perigee_km REAL, apogee_km REAL, inclination_degrees REAL);'
  )
  await env.DB.exec(
    'CREATE TABLE ownership_operators (owner_code TEXT PRIMARY KEY, owner TEXT, country_operator TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE launch_events (launch_id TEXT PRIMARY KEY, launch_year INTEGER);'
  )

  await env.DB.batch([
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('US', 'US Government', 'USA')"),
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('CN', 'China Aerospace', 'China')"),
    env.DB.prepare("INSERT INTO ownership_operators VALUES ('ZZ', 'Narnia Space', 'Narnia')"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('LA', 2010)"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('LB', 2005)"),
    env.DB.prepare("INSERT INTO launch_events VALUES ('LC', 2020)"),
    // id 1 in-orbit US; id 3 in-orbit CN; id 2 DECAYED, owner ZZ (only on a
    // decayed object — the objects table still lists it, unlike the globe).
    env.DB.prepare("INSERT INTO satellites VALUES (1, 1, 'US', 'LA')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (1, 400, 500, 51)'),
    env.DB.prepare("INSERT INTO satellites VALUES (2, 0, 'ZZ', 'LB')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (2, 600, 800, 60)'),
    env.DB.prepare("INSERT INTO satellites VALUES (3, 1, 'CN', 'LC')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (3, 300, 350, 97)'),
  ])
})

type RangeBound = { min: number; max: number }
type Facets = {
  owners: Array<{ code: string; name: string }>
  countries: string[]
  bounds: { altitudeKm: RangeBound; inclinationDeg: RangeBound; launchYear: RangeBound }
}

async function fetchFacets(): Promise<Facets> {
  const res = await SELF.fetch('https://example.com/api/objects/facets')
  expect(res.status).toBe(200)
  return (await res.json()) as Facets
}

describe('GET /api/objects/facets', () => {
  it('includes owners/countries that only appear on decayed objects', async () => {
    const body = await fetchFacets()
    // ZZ / Narnia exist only on the decayed object — the all-objects scope keeps them.
    expect(body.owners.map((o) => o.code)).toEqual(['CN', 'ZZ', 'US'])
    expect(body.countries).toEqual(['China', 'Narnia', 'USA'])
  })

  it('reports bounds across every object', async () => {
    const body = await fetchFacets()
    expect(body.bounds.altitudeKm).toEqual({ min: 300, max: 800 })
    expect(body.bounds.inclinationDeg).toEqual({ min: 51, max: 97 })
    expect(body.bounds.launchYear).toEqual({ min: 2005, max: 2020 })
  })
})
