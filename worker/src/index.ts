import type { Env } from "../../shared/env";
import { runNotifySweep } from "../../shared/notify";
import { regenerateSuggestions } from "../../shared/haiku";

// Scheduled cron: the daily notify sweep + suggestion regen at 10:00 Europe/Dublin
// (BUILD.md §6.4, §7). Suggestion regen is fire-and-forget — a Haiku hiccup
// must never block or fail the notify sweep.
export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (dublinHour() !== 10) return;
    if (withinQuietHours()) return;
    ctx.waitUntil(runNotifySweep(env));
    ctx.waitUntil(regenerateSuggestions(env).catch(() => undefined));
  },
};

function dublinHour(): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return parseInt(h, 10);
}

// Quiet-hours extension point (BUILD.md §0.3). v1 has none: one 10:00 batch,
// one recipient with their own device Do-Not-Disturb.
function withinQuietHours(): boolean {
  return false;
}
