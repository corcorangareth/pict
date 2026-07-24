import type { Env } from "../../shared/env";

// POST /api/progress — mark episode(s) or a film watched (BUILD.md §3, §5).
// Idempotent (set-to-timestamp), so a replayed offline write is safe. Designed
// to be callable from the service worker notification handler with no window.
//
// Body (one of):
//   Film:        { entryId, titleId, watched? }
//   TV single:   { entryId, titleId, season, episode, watched? }
//   TV season:   { entryId, titleId, season, all: true, watched? }
//   TV up-to-date:{ entryId, titleId, airedOnly: true, watched? }  — every aired episode
// `watched` defaults to true; pass false to un-mark.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;

  let body: {
    entryId?: number;
    titleId?: number;
    season?: number;
    episode?: number;
    all?: boolean;
    airedOnly?: boolean;
    watched?: boolean;
  };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: { code: "bad_request", message: "Invalid JSON" } }, 400);
  }

  const { entryId, titleId, season, episode, all, airedOnly } = body;
  const watched = body.watched ?? true;
  if (!titleId || !entryId) {
    return json({ error: { code: "bad_request", message: "titleId and entryId required" } }, 400);
  }

  const stamp = watched ? new Date().toISOString() : null;
  const isTv = airedOnly || season !== undefined;
  let updated = 0;

  if (isTv) {
    if (airedOnly) {
      // "I'm up to date" — mark every already-aired episode across all seasons.
      const res = await DB.prepare("UPDATE episodes SET watched_at = ?1 WHERE title_id = ?2 AND air_date <= date('now')")
        .bind(stamp, titleId)
        .run();
      updated = res.meta.changes ?? 0;
    } else if (all) {
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
  let becameCaughtUp = false;
  if (isTv) {
    const c = await DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN watched_at IS NOT NULL THEN 1 ELSE 0 END) AS watched,
         SUM(CASE WHEN air_date <= date('now') THEN 1 ELSE 0 END) AS aired,
         SUM(CASE WHEN air_date <= date('now') AND watched_at IS NOT NULL THEN 1 ELSE 0 END) AS watched_aired
       FROM episodes WHERE title_id = ?1`,
    )
      .bind(titleId)
      .first<{ total: number; watched: number; aired: number; watched_aired: number }>();
    const total = c?.total ?? 0, w = c?.watched ?? 0, aired = c?.aired ?? 0, wa = c?.watched_aired ?? 0;
    const caughtUp = aired > 0 && wa === aired;
    becameCaughtUp = caughtUp;
    const hasFuture = total > aired;
    // completed only when the show has fully aired and every episode is watched;
    // caught up on an airing show stays "watching" (waiting for more).
    if (caughtUp && !hasFuture) entryState = "completed";
    else if (w > 0) entryState = "watching";
    else entryState = "saved";
  } else {
    // Film: watched → completed, un-mark → watching.
    entryState = watched ? "completed" : "watching";
    updated = 1;
  }

  const ts = new Date().toISOString();
  // Record the first time an entry reaches "up to date" — never cleared, so the
  // hero can distinguish "was caught up, new episode" from "still catching up".
  if (becameCaughtUp) {
    await DB.prepare("UPDATE entries SET state = ?1, updated_at = ?2, caught_up_at = COALESCE(caught_up_at, ?2) WHERE id = ?3")
      .bind(entryState, ts, entryId)
      .run();
  } else {
    await DB.prepare("UPDATE entries SET state = ?1, updated_at = ?2 WHERE id = ?3").bind(entryState, ts, entryId).run();
  }

  return json({ updated, entryState });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
