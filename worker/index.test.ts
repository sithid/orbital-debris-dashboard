import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

describe('/api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await SELF.fetch('https://example.com/api/health')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    await expect(res.json()).resolves.toEqual({ ok: true })
  })
})

describe('unknown /api/* route', () => {
  it('returns 404 JSON', async () => {
    const res = await SELF.fetch('https://example.com/api/does-not-exist')

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'Not found' })
  })
})
