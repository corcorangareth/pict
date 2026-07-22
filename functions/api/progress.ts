import type { Env } from "../../shared/env";

// POST /api/progress — mark episode(s) or a film watched (BUILD.md §3, §5).
// Idempotent (set-to-timestamp), so a replayed offline write is safe. Designed
// to be callable from the service worker notification handler with no window.
//
// Body (one of):
//   Film:       { entryId, titleId, watched? }
//   TV single:  { entryId, titleId, season, episode, watched? }
//   TV season:  { entryId, titleId, season, all: true, watched? }
// `watched` defaults to true; pass false to un-mark.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;

  let body: {
    entryId?: number;
    titleId?: number;
    season?: number;
    episode?: number;
    all?: boolean;
    watched?: boolean;
  };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: { code: "bad_request", message: "Invalid JSON" } }, 400);
  }

  const { entryId, titleId, season, episode, all } = body;
  const watched = body.watched ?? true;
  if (!titleId || !entryId) {
    return json({ error: { code: "bad_request", message: "titleId and entryId required" } }, 400);
  }

  const stamp = watched ? new Date().toISOString() : null;
  const isTv = season !== undefined;
  let updated = 0;

  if (isTv) {
    if (all) {
      const res = await DB.prepare("UPDATE episodes SET watched_at = ?1 WHERE title_id = ?2 AND season = ?3")
        .bind(stamp, titleId, season)
        .run();
      updated = res.meta.changes ?? 0;
    } else if (episode !== undefined) {
      const res = await DB.prepare("UPDATE episodes SET watched_at = ?1 WHERE title_id = ?2 AND season = ?3 AND number = ?4")
        .bind(stamp, titleId, season, episode)
        .run();
      updated = res.meta.changes ?? 0;
    } else {
      return json({ error: { code: "bad_request", message: "season needs episode or all" } }, 400);
    }
  }

  // Recompute the entry state.
  let entryState: string;
  if (isTv) {
    const c = await DB.prepare(
      `SELECT
         SUM(CASE WHEN watched_at IS NOT NULL THEN 1 ELSE 0 END) AS watched,
         SUM(CASE WHEN air_date <= date('now') THEN 1 ELSE 0 END) AS aired,
         SUM(CASE WHEN air_date <= date('now') AND watched_at IS NOT NULL THEN 1 ELSE 0 END) AS watched_aired
       FROM episodes WHERE title_id = ?1`,
    )
      .bind(titleId)
      .first<{ watched: number; aired: number; watched_aired: number }>();
    const w = c?.watched ?? 0, aired = c?.aired ?? 0, wa = c?.watched_aired ?? 0;
    entryState = aired > 0 && wa === aired ? "completed" : w > 0 ? "watching" : "saved";
  } else {
    // Film: watched → completed, un-mark → watching.
    entryState = watched ? "completed" : "watching";
    updated = 1;
  }

  await DB.prepare("UPDATE entries SET state = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(entryState, new Date().toISOString(), entryId)
    .run();

  return json({ updated, entryState });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
