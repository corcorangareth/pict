import type { Env } from "../../shared/env";
import { searchMulti } from "../../shared/tmdb";

// GET /api/search?q=  — TMDB multi-search for the Add sheet (BUILD.md §3).
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const q = new URL(context.request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return json({ error: { code: "bad_request", message: "Missing query" } }, 400);

  try {
    const results = await searchMulti(context.env, q);
    return json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB unavailable";
    return json({ error: { code: "upstream", message } }, 502);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
