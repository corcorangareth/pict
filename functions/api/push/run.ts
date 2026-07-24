import type { Env } from "../../../shared/env";
import { runNotifySweep } from "../../../shared/notify";

// POST /api/push/run?date=YYYY-MM-DD — run the notify sweep now (optionally for a
// given date), so the cron logic can be tested without waiting for 10:00. Gated
// by the app password like the rest of /api.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const date = new URL(context.request.url).searchParams.get("date") || undefined;
  const summary = await runNotifySweep(context.env, date ? { today: date } : undefined);
  return new Response(JSON.stringify(summary), { headers: { "content-type": "application/json" } });
};
