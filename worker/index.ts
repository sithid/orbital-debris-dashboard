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

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, { status: 404 })
    }

    return new Response(null, { status: 404 })
  },
} satisfies ExportedHandler<Env>
