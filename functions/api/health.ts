import type { Env } from "../../shared/env";

// Smoke test: GET /api/health -> { ok, db, user }. Confirms the D1 binding
// and Access identity are wired before any real endpoint exists.
export const onRequestGet: PagesFunction<Env, string, { userEmail: string }> = async (context) => {
  let db = false;
  try {
    await context.env.DB.prepare("SELECT 1").first();
    db = true;
  } catch {
    db = false;
  }

  return new Response(
    JSON.stringify({ ok: true, db, user: context.data.userEmail }),
    { headers: { "content-type": "application/json" } },
  );
};
