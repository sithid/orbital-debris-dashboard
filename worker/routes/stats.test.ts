import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE satellites (norad_id INTEGER PRIMARY KEY, in_orbit INTEGER);'
  )
  await env.DB.exec(
    'CREATE TABLE risk_assessment (norad_id INTEGER PRIMARY KEY, is_zombie INTEGER);'
  )

  await env.DB.batch([
    env.DB.prepare('INSERT INTO satellites (norad_id, in_orbit) VALUES (?, ?)').bind(1, 1),
    env.DB.prepare('INSERT INTO satellites (norad_id, in_orbit) VALUES (?, ?)').bind(2, 1),
    env.DB.prepare('INSERT INTO satellites (norad_id, in_orbit) VALUES (?, ?)').bind(3, 0),
    env.DB.prepare('INSERT INTO satellites (norad_id, in_orbit) VALUES (?, ?)').bind(4, 0),
    env.DB.prepare('INSERT INTO risk_assessment (norad_id, is_zombie) VALUES (?, ?)').bind(1, 1),
    env.DB.prepare('INSERT INTO risk_assessment (norad_id, is_zombie) VALUES (?, ?)').bind(2, 0),
    env.DB.prepare('INSERT INTO risk_assessment (norad_id, is_zombie) VALUES (?, ?)').bind(3, 0),
    env.DB.prepare('INSERT INTO risk_assessment (norad_id, is_zombie) VALUES (?, ?)').bind(4, 0),
  ])
})

describe('GET /api/stats', () => {
  it('returns the expected shape', async () => {
    const res = await SELF.fetch('https://example.com/api/stats')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')

    const body = (await res.json()) as Record<string, unknown>
    expect(body).toEqual({
      total: expect.any(Number),
      inOrbit: expect.any(Number),
      zombie: expect.any(Number),
    })
  })

  it('returns counts that match the seeded fixture', async () => {
    const res = await SELF.fetch('https://example.com/api/stats')
    const body = (await res.json()) as { total: number; inOrbit: number; zombie: number }

    expect(body.total).toBe(4)
    expect(body.inOrbit).toBe(2)
    expect(body.zombie).toBe(1)
  })
})
