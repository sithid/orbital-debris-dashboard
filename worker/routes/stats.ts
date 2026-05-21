export interface Stats {
  total: number
  inOrbit: number
  zombie: number
}

export async function getStats(env: Env): Promise<Stats> {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM satellites)                          AS total,
       (SELECT COUNT(*) FROM satellites      WHERE in_orbit = 1)  AS in_orbit,
       (SELECT COUNT(*) FROM risk_assessment WHERE is_zombie = 1) AS zombie`
  ).first<{ total: number; in_orbit: number; zombie: number }>()

  return {
    total: row!.total,
    inOrbit: row!.in_orbit,
    zombie: row!.zombie,
  }
}
