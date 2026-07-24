import type { Env } from "../../shared/env";
import { readSuggestionsCache, regenerateSuggestions } from "../../shared/haiku";
import { CRITIC_DEFAULT } from "../../shared/constants";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// GET /api/suggestions — cached list, filtered to the current threshold.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const [{ suggestions, generated_at }, threshold] = await Promise.all([
    readSuggestionsCache(env),
    getThreshold(env),
  ]);
  const filtered = suggestions.filter((s) => s.critic_score >= threshold);
  return json({ suggestions: filtered, generated_at });
};

// POST /api/suggestions — regenerate now. Concurrency-guarded so a double-tap
// doesn't spin up a second Haiku call: if the cache was written seconds ago,
// return it instead of rerunning.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const recent = await env.DB.prepare(
    `SELECT generated_at FROM suggestions ORDER BY id ASC LIMIT 1`,
  ).first<{ generated_at: string }>();
  if (recent?.generated_at) {
    const ageMs = Date.now() - Date.parse(recent.generated_at);
    if (Number.isFinite(ageMs) && ageMs < 15_000) {
      const { suggestions, generated_at } = await readSuggestionsCache(env);
      const threshold = await getThreshold(env);
      return json({ suggestions: suggestions.filter((s) => s.critic_score >= threshold), generated_at });
    }
  }

  try {
    const list = await regenerateSuggestions(env);
    const threshold = await getThreshold(env);
    const generated_at = list.length ? new Date().toISOString() : null;
    return json({ suggestions: list.filter((s) => s.critic_score >= threshold), generated_at });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggestion pipeline failed";
    return json({ error: { code: "server", message } }, 500);
  }
};

async function getThreshold(env: Env): Promise<number> {
  const row = await env.DB.prepare(`SELECT critic_threshold FROM settings WHERE id = 1`).first<{
    critic_threshold: number;
  }>();
  return row?.critic_threshold ?? CRITIC_DEFAULT;
}
