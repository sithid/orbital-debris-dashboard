import { getObject } from "./routes/object"
import { getObjects, ObjectsQueryError } from "./routes/objects"
import { getStats } from "./routes/stats"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  })
}

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true })
    }

    if (url.pathname === "/api/stats") {
      return json(await getStats(env))
    }

    if (url.pathname === "/api/objects") {
      try {
        return json(await getObjects(env, url))
      } catch (err) {
        if (err instanceof ObjectsQueryError) {
          return json({ error: err.message }, { status: 400 })
        }
        throw err
      }
    }

    const objectMatch = url.pathname.match(/^\/api\/objects\/([^/]+)$/)
    if (objectMatch) {
      const id = Number.parseInt(objectMatch[1], 10)
      if (!Number.isFinite(id) || id < 0) {
        return json({ error: "Invalid NORAD ID" }, { status: 400 })
      }
      const detail = await getObject(env, id)
      if (!detail) {
        return json({ error: "Not found" }, { status: 404 })
      }
      return json(detail)
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, { status: 404 })
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
