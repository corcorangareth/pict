import type { Env } from "../../shared/env";

// GET /api/session — 200 when a valid session cookie is present (the API gate in
// _middleware.ts returns 401 otherwise). The client calls this on load to decide
// between the app and the unlock screen.
export const onRequestGet: PagesFunction<Env> = async () =>
  new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
