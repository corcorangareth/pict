import type { Env } from "../../../shared/env";
import { sendToAll } from "../../../shared/push-send";

// POST /api/push/test — send a test notification to all stored subscriptions,
// so a real push can be verified on-device without waiting for the daily cron.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const result = await sendToAll(context.env, {
    title: "Pict is set up",
    body: "You'll get a nudge the moment something you're tracking is out.",
    tag: "pict-test",
    data: { deepLink: "/" },
  });
  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
};
