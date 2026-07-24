import type { Env } from "../../../shared/env";

// POST /api/push/unsubscribe { endpoint } — remove a subscription.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { endpoint?: string };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (body.endpoint) {
    await context.env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(body.endpoint).run();
  }
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
