import { env, SELF } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { getVisitorCounts, recordVisit } from './visitors'

function reqFromIp(ip: string): Request {
  return new Request('https://example.com/', { headers: { 'CF-Connecting-IP': ip } })
}

beforeAll(async () => {
  await env.DB.exec(
    'CREATE TABLE visitors (visitor_hash TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (visitor_hash, day));'
  )
})

describe('recordVisit', () => {
  it('dedupes repeat visits from the same IP on the same day', async () => {
    await recordVisit(env, reqFromIp('10.0.0.1'))
    await recordVisit(env, reqFromIp('10.0.0.1'))
    await recordVisit(env, reqFromIp('10.0.0.1'))
    const counts = await getVisitorCounts(env)
    expect(counts.daily).toBe(1)
    expect(counts.allTime).toBe(1)
  })

  it('counts distinct IPs separately', async () => {
    await recordVisit(env, reqFromIp('10.0.0.2'))
    await recordVisit(env, reqFromIp('10.0.0.3'))
    const counts = await getVisitorCounts(env)
    expect(counts.daily).toBe(3) // .1, .2, .3
    expect(counts.allTime).toBe(3)
  })

  it('ignores requests with no client IP', async () => {
    await recordVisit(env, new Request('https://example.com/'))
    const counts = await getVisitorCounts(env)
    expect(counts.daily).toBe(3)
  })

  it('counts an old-day visitor in all-time but not today', async () => {
    // Seed a visitor only on a past day.
    await env.DB.prepare('INSERT OR IGNORE INTO visitors (visitor_hash, day) VALUES (?, ?)')
      .bind('old-visitor', '2000-01-01')
      .run()
    const counts = await getVisitorCounts(env)
    expect(counts.daily).toBe(3) // unchanged today
    expect(counts.allTime).toBe(4) // .1, .2, .3 + old-visitor
  })
})

describe('GET /api/visitors', () => {
  it('returns the counts shape', async () => {
    const res = await SELF.fetch('https://example.com/api/visitors')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { daily: number; allTime: number }
    expect(body).toMatchObject({ daily: expect.any(Number), allTime: expect.any(Number) })
  })
})
