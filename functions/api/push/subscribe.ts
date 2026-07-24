import type { Env } from "../../../shared/env";

// POST /api/push/subscribe — store a PushSubscription (BUILD.md §6.3).
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    sub = await context.request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return json({ error: "invalid_subscription" }, 400);
  }

  await context.env.DB.prepare(
    `INSERT INTO push_subs (endpoint, p256dh, auth, created_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
  )
    .bind(sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString())
    .run();

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
