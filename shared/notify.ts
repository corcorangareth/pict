import type { Env } from "./env";
import { parseJson } from "./db";
import { getWatchProviders } from "./tmdb";
import { sendToAll, type PushPayload } from "./push-send";

// The daily notify sweep (BUILD.md §6.4). Finds TV episodes airing today and
// films that have newly landed on streaming (region IE), for notifiable entries,
// batches if more than three, sends, and marks everything so nothing double-fires.
// Reused by the cron Worker and the manual /api/push/run test endpoint.
export interface NotifySummary {
  today: string;
  episodes: string[];
  releases: string[];
  batched: boolean;
  sent: number;
}

interface QueueItem {
  payload: PushPayload;
  mark: () => Promise<unknown>;
}

export async function runNotifySweep(env: Env, opts?: { today?: string }): Promise<NotifySummary> {
  const today = opts?.today ?? dublinDate();
  const now = new Date().toISOString();
  const items: QueueItem[] = [];
  const episodes: string[] = [];
  const releases: string[] = [];

  // 1. TV episodes airing today, not yet notified, for notifiable entries.
  // Any non-abandoned entry counts — a completed-but-still-airing show (you're
  // caught up, a new season is coming) should still alert on new episodes.
  const epRows = await env.DB.prepare(
    `SELECT ep.id AS episode_id, ep.title_id, ep.season, ep.number, t.name AS title_name, t.networks,
            (SELECT e.id FROM entries e WHERE e.title_id = t.id AND e.state != 'abandoned' AND e.notify = 1 ORDER BY e.id LIMIT 1) AS entry_id
       FROM episodes ep JOIN titles t ON t.id = ep.title_id
      WHERE ep.air_date = ?1 AND ep.notified_at IS NULL
        AND EXISTS (SELECT 1 FROM entries e WHERE e.title_id = t.id AND e.state != 'abandoned' AND e.notify = 1)`,
  )
    .bind(today)
    .all<Record<string, unknown>>();

  for (const r of epRows.results ?? []) {
    const episodeId = r.episode_id as number;
    const where = parseJson<string[]>(r.networks, [])[0] ?? undefined;
    episodes.push(`${r.title_name} S${r.season}E${r.number}`);
    items.push({
      payload: {
        title: `${r.title_name} — Season ${r.season}, Episode ${r.number} is out`,
        body: where,
        tag: `ep-${episodeId}`,
        data: { kind: "tv", entryId: r.entry_id, titleId: r.title_id, season: r.season, episode: r.number, titleName: r.title_name, deepLink: "/" },
        actions: [{ action: "watched", title: "Mark watched" }, { action: "snooze", title: "Snooze" }],
      },
      mark: () => env.DB.prepare("UPDATE episodes SET notified_at = ?1 WHERE id = ?2").bind(now, episodeId).run(),
    });
  }

  // 2. Films newly on streaming: re-poll providers, notify on any not seen before.
  const movieRows = await env.DB.prepare(
    `SELECT t.id AS title_id, t.tmdb_id, t.name,
            (SELECT e.id FROM entries e WHERE e.title_id = t.id AND e.state IN ('saved','watching') AND e.notify = 1 ORDER BY e.id LIMIT 1) AS entry_id
       FROM titles t
      WHERE t.media_type = 'movie'
        AND EXISTS (SELECT 1 FROM entries e WHERE e.title_id = t.id AND e.state IN ('saved','watching') AND e.notify = 1)`,
  ).all<Record<string, unknown>>();

  for (const m of movieRows.results ?? []) {
    let providers: string[];
    try {
      providers = await getWatchProviders(env, m.tmdb_id as number, "movie");
    } catch {
      continue;
    }
    const existing = await env.DB.prepare("SELECT provider FROM releases WHERE title_id = ?1").bind(m.title_id).all<{ provider: string }>();
    const known = new Set((existing.results ?? []).map((x) => x.provider));
    for (const provider of providers) {
      if (known.has(provider)) continue;
      const inserted = await env.DB.prepare(
        "INSERT OR IGNORE INTO releases (title_id, provider, release_date, notified_at) VALUES (?1, ?2, ?3, NULL) RETURNING id",
      )
        .bind(m.title_id, provider, today)
        .first<{ id: number }>();
      const relId = inserted?.id;
      releases.push(`${m.name} on ${provider}`);
      items.push({
        payload: {
          title: `${m.name} is now on ${provider}`,
          tag: `rel-${m.title_id}-${provider}`,
          data: { kind: "movie", entryId: m.entry_id, titleId: m.title_id, titleName: m.name, deepLink: "/" },
          actions: [{ action: "watched", title: "Mark watched" }, { action: "not-yet", title: "Not yet" }],
        },
        mark: relId
          ? () => env.DB.prepare("UPDATE releases SET notified_at = ?1 WHERE id = ?2").bind(now, relId).run()
          : async () => {},
      });
    }
  }

  // 3. Send — batch into one push if more than three fire the same day (PRD §5).
  let sent = 0;
  if (items.length > 3) {
    const r = await sendToAll(env, {
      title: `${items.length} new titles are out today`,
      tag: `batch-${today}`,
      data: { deepLink: "/" },
    });
    sent = r.sent;
    await Promise.all(items.map((it) => it.mark()));
  } else {
    for (const it of items) {
      const r = await sendToAll(env, it.payload);
      sent += r.sent;
      await it.mark();
    }
  }

  return { today, episodes, releases, batched: items.length > 3, sent };
}

// Today's date in Europe/Dublin (en-CA formats as YYYY-MM-DD).
function dublinDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(new Date());
}
