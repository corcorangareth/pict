import type { Env } from "../../../shared/env";
import { mapTitleRow, mapEntryRow, mapEpisodeRow, mapReleaseRow } from "../../../shared/db";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// GET /api/titles/:id — one title with all its entries, seasons, and releases.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);
  const { DB } = context.env;

  const titleRow = await DB.prepare("SELECT * FROM titles WHERE id = ?1").bind(id).first<Record<string, unknown>>();
  if (!titleRow) return json({ error: { code: "not_found", message: "Title not found" } }, 404);

  const [entries, episodes, releases] = await Promise.all([
    DB.prepare("SELECT * FROM entries WHERE title_id = ?1").bind(id).all<Record<string, unknown>>(),
    DB.prepare("SELECT * FROM episodes WHERE title_id = ?1 ORDER BY season, number").bind(id).all<Record<string, unknown>>(),
    DB.prepare("SELECT * FROM releases WHERE title_id = ?1 ORDER BY release_date").bind(id).all<Record<string, unknown>>(),
  ]);

  // Group episodes into seasons.
  const seasonsMap = new Map<number, ReturnType<typeof mapEpisodeRow>[]>();
  for (const row of episodes.results ?? []) {
    const ep = mapEpisodeRow(row);
    const arr = seasonsMap.get(ep.season) ?? [];
    arr.push(ep);
    seasonsMap.set(ep.season, arr);
  }
  const seasons = [...seasonsMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([season, eps]) => ({ season, episodes: eps }));

  return json({
    title: mapTitleRow(titleRow),
    entries: (entries.results ?? []).map(mapEntryRow),
    seasons,
    releases: (releases.results ?? []).map(mapReleaseRow),
  });
};

// DELETE /api/titles/:id — remove the whole title (cascades entries/episodes/releases).
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);
  await context.env.DB.prepare("DELETE FROM titles WHERE id = ?1").bind(id).run();
  return json({ ok: true });
};
