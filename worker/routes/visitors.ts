export interface VisitorCounts {
  daily: number
  allTime: number
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Record a visit, deduped per (visitor, day). The visitor is a salted SHA-256 of
 * the client IP — no cookies, no reversible PII stored. Fire-and-forget: callers
 * wrap this in `ctx.waitUntil`, and INSERT OR IGNORE makes same-day repeats a
 * no-op, so a DB hiccup never affects page serving.
 */
export async function recordVisit(env: Env, request: Request): Promise<void> {
  const ip = request.headers.get('CF-Connecting-IP')
  if (!ip) return
  const hash = await sha256Hex(ip + (env.VISITOR_SALT ?? ''))
  await env.DB.prepare('INSERT OR IGNORE INTO visitors (visitor_hash, day) VALUES (?, ?)')
    .bind(hash, todayUtc())
    .run()
}

export async function getVisitorCounts(env: Env): Promise<VisitorCounts> {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM visitors WHERE day = ?)        AS daily,
       (SELECT COUNT(DISTINCT visitor_hash) FROM visitors)  AS all_time`
  )
    .bind(todayUtc())
    .first<{ daily: number; all_time: number }>()

  return { daily: row?.daily ?? 0, allTime: row?.all_time ?? 0 }
}
