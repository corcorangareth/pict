import type { Env } from "../../../shared/env";

// GET /api/push/vapid-public — the VAPID public key for pushManager.subscribe.
export const onRequestGet: PagesFunction<Env> = async (context) =>
  new Response(JSON.stringify({ key: context.env.VAPID_PUBLIC_KEY }), {
    headers: { "content-type": "application/json" },
  });
