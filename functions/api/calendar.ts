import type { Env } from "../../shared/env";
import { parseJson } from "../../shared/db";

// GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — episodes (by air_date) and
// streaming releases (by release_date) for tracked titles in the window, across
// all lists. TV episodes vs film releases; the client shows one or the other
// per the global Shows/Movies toggle (BUILD.md §7).
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get("from") || today;
  const to = url.searchParams.get("to") || plusDays(today, 120);

  const rows = await context.env.DB.prepare(
    `SELECT ep.air_date AS date, 'episode' AS type, t.id AS title_id, t.name, t.media_type,
            t.poster_path, t.art_palette, ep.season, ep.number, ep.name AS detail,
            (ep.watched_at IS NOT NULL) AS watched,
            (SELECT audience FROM entries e2 WHERE e2.title_id = t.id AND e2.state != 'abandoned' LIMIT 1) AS audience
       FROM episodes ep JOIN titles t ON t.id = ep.title_id
      WHERE ep.air_date >= ?1 AND ep.air_date <= ?2
        AND EXISTS (SELECT 1 FROM entries e WHERE e.title_id = t.id AND e.state != 'abandoned')
     UNION ALL
     SELECT r.release_date AS date, 'release' AS type, t.id AS title_id, t.name, t.media_type,
            t.poster_path, t.art_palette, NULL AS season, NULL AS number, r.provider AS detail,
            0 AS watched,
            (SELECT audience FROM entries e2 WHERE e2.title_id = t.id AND e2.state != 'abandoned' LIMIT 1) AS audience
       FROM releases r JOIN titles t ON t.id = r.title_id
      WHERE r.release_date >= ?1 AND r.release_date <= ?2
        AND EXISTS (SELECT 1 FROM entries e WHERE e.title_id = t.id AND e.state != 'abandoned')
     ORDER BY date`,
  )
    .bind(from, to)
    .all<Record<string, unknown>>();

  const items = (rows.results ?? []).map((r) => {
    const isEp = r.type === "episode";
    return {
      date: r.date as string,
      type: r.type as "episode" | "release",
      title_id: r.title_id as number,
      name: r.name as string,
      media_type: r.media_type as "tv" | "movie",
      poster_path: (r.poster_path as string) ?? null,
      art_palette: parseJson(r.art_palette, null as null | Record<string, string>),
      audience: (r.audience as string) ?? null,
      watched: !!r.watched,
      label: isEp ? `Season ${r.season}, Episode ${r.number}` : `New on ${r.detail}`,
    };
  });

  return new Response(JSON.stringify({ items }), { headers: { "content-type": "application/json" } });
};

function plusDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
