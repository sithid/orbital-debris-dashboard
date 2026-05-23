import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, cospar_id TEXT, object_name TEXT, satellite_name TEXT, official_name TEXT, object_type TEXT, category TEXT, ops_status TEXT, data_status TEXT, decay_date TEXT, in_orbit INTEGER, owner_code TEXT, launch_id TEXT, user_category TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE orbital_data (norad_id INTEGER PRIMARY KEY, orbit_class TEXT, orbit_type TEXT, period_minutes REAL, perigee_km REAL, apogee_km REAL, inclination_degrees REAL, eccentricity REAL, semi_major_axis_km REAL, launch_mass_kg REAL, proxy_mass_kg REAL, dry_mass_kg REAL, power_watts REAL, proxy_power_watts REAL, rcs REAL, rcs_class TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE ucs_details (norad_id INTEGER PRIMARY KEY, lifetime_years REAL, sat_age_years REAL, primary_purpose TEXT, detailed_purpose TEXT, geo_longitude REAL, un_registry TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE risk_assessment (norad_id INTEGER PRIMARY KEY, velocity_kms REAL, kinetic_joules REAL, is_zombie INTEGER);'
  )
  await env.DB.exec(
    'CREATE TABLE ownership_operators (owner_code TEXT PRIMARY KEY, owner TEXT, country_operator TEXT, users TEXT, is_commercial INTEGER, is_government INTEGER, is_military INTEGER, is_civil INTEGER, contractor TEXT, contractor_country TEXT);'
  )
  await env.DB.exec(
    'CREATE TABLE launch_events (launch_id TEXT PRIMARY KEY, launch_date TEXT, launch_year INTEGER, launch_site TEXT);'
  )

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO ownership_operators (owner_code, owner, country_operator, users, is_commercial, is_government, is_military, is_civil, contractor, contractor_country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind('ISS', 'Multinational', 'INTL', 'Government', 0, 1, 0, 1, 'Boeing', 'US'),
    env.DB.prepare(
      'INSERT INTO launch_events (launch_id, launch_date, launch_year, launch_site) VALUES (?, ?, ?, ?)'
    ).bind('1998-067', '1998-11-20', 1998, 'Baikonur'),
    env.DB.prepare(
      'INSERT INTO satellites (norad_id, cospar_id, object_name, satellite_name, official_name, object_type, category, ops_status, data_status, decay_date, in_orbit, owner_code, launch_id, user_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      25544,
      '1998-067A',
      'ISS (ZARYA)',
      'ZARYA',
      'International Space Station',
      'PAYLOAD',
      'STATION',
      'OPERATIONAL',
      'CURRENT',
      null,
      1,
      'ISS',
      '1998-067',
      'CREWED'
    ),
    env.DB.prepare(
      'INSERT INTO orbital_data (norad_id, orbit_class, orbit_type, period_minutes, perigee_km, apogee_km, inclination_degrees, eccentricity, semi_major_axis_km, launch_mass_kg, proxy_mass_kg, dry_mass_kg, power_watts, proxy_power_watts, rcs, rcs_class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      25544,
      'LEO',
      'LEO',
      92.68,
      418.0,
      420.0,
      51.64,
      0.0001,
      6789.0,
      420000.0,
      null,
      null,
      120000.0,
      null,
      399.0,
      'LARGE'
    ),
    env.DB.prepare(
      'INSERT INTO ucs_details (norad_id, lifetime_years, sat_age_years, primary_purpose, detailed_purpose, geo_longitude, un_registry) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(25544, 30.0, 27.0, 'Scientific', 'Crewed laboratory', null, 'UN-1998'),
    env.DB.prepare(
      'INSERT INTO risk_assessment (norad_id, velocity_kms, kinetic_joules, is_zombie) VALUES (?, ?, ?, ?)'
    ).bind(25544, 7.66, 1.2e13, 0),

    env.DB.prepare(
      'INSERT INTO satellites (norad_id, object_name, object_type, in_orbit) VALUES (?, ?, ?, ?)'
    ).bind(99999, 'SPARSE OBJECT', 'DEBRIS', 1),
  ])
})

type DetailResponse = {
  identification: Record<string, unknown>
  orbital: Record<string, unknown>
  ucs: Record<string, unknown>
  risk: Record<string, unknown>
  ownership: Record<string, unknown>
  launch: Record<string, unknown>
}

describe('GET /api/objects/:id', () => {
  it('returns the full detail for a known NORAD ID', async () => {
    const res = await SELF.fetch('https://example.com/api/objects/25544')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')

    const body = (await res.json()) as DetailResponse

    expect(body).toHaveProperty('identification')
    expect(body).toHaveProperty('orbital')
    expect(body).toHaveProperty('ucs')
    expect(body).toHaveProperty('risk')
    expect(body).toHaveProperty('ownership')
    expect(body).toHaveProperty('launch')

    expect(body.identification).toMatchObject({
      norad_id: 25544,
      cospar_id: '1998-067A',
      object_name: 'ISS (ZARYA)',
      object_type: 'PAYLOAD',
      ops_status: 'OPERATIONAL',
      in_orbit: 1,
    })
    expect(body.orbital).toMatchObject({
      orbit_class: 'LEO',
      period_minutes: 92.68,
      inclination_degrees: 51.64,
    })
    expect(body.ucs).toMatchObject({
      primary_purpose: 'Scientific',
      un_registry: 'UN-1998',
    })
    expect(body.risk).toMatchObject({
      is_zombie: 0,
      velocity_kms: 7.66,
    })
    expect(body.ownership).toMatchObject({
      owner_code: 'ISS',
      owner: 'Multinational',
      country_operator: 'INTL',
    })
    expect(body.launch).toMatchObject({
      launch_id: '1998-067',
      launch_year: 1998,
      launch_site: 'Baikonur',
    })
  })

  it('returns 404 for an unknown NORAD ID', async () => {
    const res = await SELF.fetch('https://example.com/api/objects/123456789')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Not found')
  })

  it('returns 400 for a non-numeric NORAD ID', async () => {
    const res = await SELF.fetch('https://example.com/api/objects/not-a-number')
    expect(res.status).toBe(400)
  })

  it('returns nulls for missing related rows (sparse data)', async () => {
    const res = await SELF.fetch('https://example.com/api/objects/99999')
    expect(res.status).toBe(200)
    const body = (await res.json()) as DetailResponse

    expect(body.identification).toMatchObject({
      norad_id: 99999,
      object_name: 'SPARSE OBJECT',
    })
    expect(body.orbital.orbit_class).toBeNull()
    expect(body.ucs.primary_purpose).toBeNull()
    expect(body.risk.is_zombie).toBeNull()
    expect(body.ownership.owner).toBeNull()
    expect(body.launch.launch_date).toBeNull()
  })
})
