import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, in_orbit INTEGER, object_name TEXT, owner_code TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, semi_major_axis_km REAL, eccentricity REAL, inclination_degrees REAL);'
  )
  await env.DB.exec(
    'CREATE TABLE ownership_operators (owner_code TEXT PRIMARY KEY, owner TEXT, country_operator TEXT);'
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
  ])

  const batch = [
    // Two valid candidates: one US, one PRC.
    env.DB.prepare(
      "INSERT INTO satellites VALUES (1, 1, 'ALPHA', 'US')"
    ),
    env.DB.prepare('INSERT INTO orbital_data VALUES (1, 7000, 0.01, 51)'),
    env.DB.prepare("INSERT INTO satellites VALUES (2, 1, 'BETA', 'PRC')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (2, 7200, 0.02, 53)'),
    // Candidate whose operator's owner name is the placeholder "owner".
    env.DB.prepare("INSERT INTO satellites VALUES (4, 1, 'NICO-SAT', 'NICO')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (4, 7300, 0.01, 55)'),
    // Decayed object owned by XX — excluded from the candidate set.
    env.DB.prepare("INSERT INTO satellites VALUES (3, 0, 'GONE', 'XX')"),
    env.DB.prepare('INSERT INTO orbital_data VALUES (3, 7100, 0.01, 50)'),
  ]
  await env.DB.batch(batch)
})

type Facets = {
  owners: Array<{ code: string; name: string }>
  countries: string[]
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
})
