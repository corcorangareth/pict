import type { Env } from "../../../shared/env";
import { mapEntryRow } from "../../../shared/db";

type Audience = "me" | "us" | "family";
type EntryState = "saved" | "watching" | "completed" | "abandoned";
const AUDIENCES: Audience[] = ["me", "us", "family"];
const STATES: EntryState[] = ["saved", "watching", "completed", "abandoned"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// PATCH /api/entries/:id — change state, audience, or notify (BUILD.md §3).
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);
  const { DB } = context.env;

  let body: { state?: EntryState; audience?: Audience; notify?: boolean };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: { code: "bad_request", message: "Invalid JSON" } }, 400);
  }

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.state !== undefined) {
    if (!STATES.includes(body.state)) return json({ error: { code: "bad_request", message: "invalid state" } }, 400);
    sets.push(`state = ?${binds.push(body.state)}`);
  }
  if (body.audience !== undefined) {
    if (!AUDIENCES.includes(body.audience)) return json({ error: { code: "bad_request", message: "invalid audience" } }, 400);
    sets.push(`audience = ?${binds.push(body.audience)}`);
  }
  if (body.notify !== undefined) {
    sets.push(`notify = ?${binds.push(body.notify ? 1 : 0)}`);
  }
  if (sets.length === 0) return json({ error: { code: "bad_request", message: "nothing to update" } }, 400);

  sets.push(`updated_at = ?${binds.push(new Date().toISOString())}`);
  binds.push(id);

  let row: Record<string, unknown> | null;
  try {
    row = await DB.prepare(`UPDATE entries SET ${sets.join(", ")} WHERE id = ?${binds.length} RETURNING *`)
      .bind(...binds)
      .first<Record<string, unknown>>();
  } catch {
    // UNIQUE(title_id, audience) — that audience already tracks this title.
    return json({ error: { code: "bad_request", message: "That list already has this title" } }, 409);
  }

  if (!row) return json({ error: { code: "not_found", message: "Entry not found" } }, 404);
  return json({ entry: mapEntryRow(row) });
};

// DELETE /api/entries/:id — remove from a list. Cleans up the title if it was
// the last entry pointing at it.
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);
  const { DB } = context.env;

  const entry = await DB.prepare("SELECT title_id FROM entries WHERE id = ?1").bind(id).first<{ title_id: number }>();
  if (!entry) return json({ error: { code: "not_found", message: "Entry not found" } }, 404);

  await DB.prepare("DELETE FROM entries WHERE id = ?1").bind(id).run();
  const remaining = await DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE title_id = ?1")
    .bind(entry.title_id)
    .first<{ n: number }>();
  if ((remaining?.n ?? 0) === 0) {
    await DB.prepare("DELETE FROM titles WHERE id = ?1").bind(entry.title_id).run();
  }

  return json({ ok: true });
};
