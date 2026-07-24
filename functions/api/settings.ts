import type { Env } from "../../shared/env";
import { CRITIC_DEFAULT, CRITIC_MIN, CRITIC_MAX } from "../../shared/constants";

interface SettingsRow {
  critic_threshold: number;
  soft_prompt_seen: number;
  updated_at: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const now = () => new Date().toISOString();

async function readOrSeed(env: Env): Promise<SettingsRow> {
  const row = await env.DB.prepare(`SELECT critic_threshold, soft_prompt_seen, updated_at FROM settings WHERE id = 1`)
    .first<SettingsRow>();
  if (row) return row;
  const ts = now();
  await env.DB.prepare(
    `INSERT INTO settings (id, critic_threshold, soft_prompt_seen, updated_at)
     VALUES (1, ?1, 0, ?2)
     ON CONFLICT(id) DO NOTHING`,
  ).bind(CRITIC_DEFAULT, ts).run();
  return { critic_threshold: CRITIC_DEFAULT, soft_prompt_seen: 0, updated_at: ts };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const row = await readOrSeed(context.env);
  return json({ settings: shape(row) });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  let body: { critic_threshold?: number; soft_prompt_seen?: boolean | number };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: { code: "bad_request", message: "Invalid JSON" } }, 400);
  }

  const current = await readOrSeed(context.env);
  const next = { ...current };
  if (typeof body.critic_threshold === "number") {
    next.critic_threshold = clamp(Math.round(body.critic_threshold), CRITIC_MIN, CRITIC_MAX);
  }
  if (body.soft_prompt_seen != null) next.soft_prompt_seen = body.soft_prompt_seen ? 1 : 0;
  next.updated_at = now();

  await context.env.DB.prepare(
    `UPDATE settings SET critic_threshold = ?1, soft_prompt_seen = ?2, updated_at = ?3 WHERE id = 1`,
  ).bind(next.critic_threshold, next.soft_prompt_seen, next.updated_at).run();

  return json({ settings: shape(next) });
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function shape(r: SettingsRow) {
  return {
    critic_threshold: r.critic_threshold,
    soft_prompt_seen: !!r.soft_prompt_seen,
    updated_at: r.updated_at,
  };
}
