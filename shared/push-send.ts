import { buildPushPayload, type PushMessage, type PushSubscription } from "@block65/webcrypto-web-push";
import type { Env } from "./env";

export type { PushSubscription };

// The notification payload the service worker receives (event.data.json()).
export interface PushPayload {
  title: string;
  body?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

function vapid(env: Env) {
  return { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
}

// Send one push. Returns the HTTP status so callers can prune dead endpoints
// (404/410 = gone).
export async function sendPush(sub: PushSubscription, payload: PushPayload, env: Env): Promise<number> {
  const message = { data: payload, options: { ttl: 60 * 60 * 24, urgency: "high" } } as unknown as PushMessage;
  const { headers, method, body } = await buildPushPayload(message, sub, vapid(env));
  const res = await fetch(sub.endpoint, { method, headers, body: body as BodyInit });
  return res.status;
}

// Send a payload to every stored subscription, pruning dead ones.
export async function sendToAll(env: Env, payload: PushPayload): Promise<{ sent: number; pruned: number }> {
  const rows = await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subs").all<{
    endpoint: string;
    p256dh: string;
    auth: string;
  }>();
  let sent = 0;
  let pruned = 0;
  for (const row of rows.results ?? []) {
    const sub: PushSubscription = { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } };
    try {
      const status = await sendPush(sub, payload, env);
      if (status === 404 || status === 410) {
        await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(row.endpoint).run();
        pruned++;
      } else if (status >= 200 && status < 300) {
        sent++;
      }
    } catch {
      /* keep the subscription; transient send failure */
    }
  }
  return { sent, pruned };
}
