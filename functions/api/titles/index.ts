import type { Env } from "../../../shared/env";
import { getDetail, type MediaType } from "../../../shared/tmdb";
import { getRottenTomatoes } from "../../../shared/omdb";
import { resolveCriticScore } from "../../../shared/critic";
import { extractPalette } from "../../../shared/palette";

type Audience = "me" | "us" | "family";
type EntryState = "saved" | "watching" | "completed" | "abandoned";

const AUDIENCES: Audience[] = ["me", "us", "family"];
const STATES: EntryState[] = ["saved", "watching", "completed", "abandoned"];

const now = () => new Date().toISOString();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// ── GET /api/titles — the library, joined + rolled up (BUILD.md §3) ─────────
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const rows = await DB.prepare(
    `SELECT e.id AS entry_id, e.audience, e.state, e.notify, e.added_at, e.updated_at,
            t.*,
            (SELECT COUNT(*) FROM episodes ep WHERE ep.title_id = t.id) AS ep_total,
            (SELECT COUNT(*) FROM episodes ep WHERE ep.title_id = t.id AND ep.watched_at IS NOT NULL) AS ep_watched,
            (SELECT MIN(air_date) FROM episodes ep WHERE ep.title_id = t.id AND ep.air_date >= date('now')) AS next_air,
            (SELECT season || '|' || number FROM episodes ep WHERE ep.title_id = t.id AND ep.air_date >= date('now') ORDER BY air_date LIMIT 1) AS next_air_ep,
            (SELECT season || '|' || number || '|' || COALESCE(name, '') FROM episodes ep WHERE ep.title_id = t.id AND ep.watched_at IS NULL AND ep.air_date <= date('now') ORDER BY season, number LIMIT 1) AS next_unwatched,
            (SELECT MIN(release_date) FROM releases r WHERE r.title_id = t.id AND r.release_date >= date('now')) AS next_rel,
            (SELECT provider FROM releases r WHERE r.title_id = t.id AND r.release_date >= date('now') ORDER BY release_date LIMIT 1) AS next_rel_provider
       FROM entries e
       JOIN titles t ON t.id = e.title_id
       ORDER BY e.updated_at DESC`,
  ).all<Record<string, unknown>>();

  const library = (rows.results ?? []).map(mapLibraryRow);
  return json({ library });
};

// ── POST /api/titles — add a title (import + enrich + persist) ───────────────
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB, env } = { DB: context.env.DB, env: context.env };

  let body: { tmdb_id?: number; media_type?: MediaType; audience?: Audience; state?: EntryState };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: { code: "bad_request", message: "Invalid JSON" } }, 400);
  }

  const { tmdb_id, media_type } = body;
  const audience = body.audience;
  const state: EntryState = body.state ?? "saved";
  if (!tmdb_id || (media_type !== "tv" && media_type !== "movie")) {
    return json({ error: { code: "bad_request", message: "tmdb_id and media_type required" } }, 400);
  }
  if (!audience || !AUDIENCES.includes(audience)) {
    return json({ error: { code: "bad_request", message: "valid audience required" } }, 400);
  }
  if (!STATES.includes(state)) {
    return json({ error: { code: "bad_request", message: "invalid state" } }, 400);
  }

  // 1. Import from TMDB (mock or live).
  let detail;
  try {
    detail = await getDetail(env, tmdb_id, media_type);
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB unavailable";
    return json({ error: { code: "upstream", message } }, 502);
  }

  // 2. Critic score (non-fatal). 3. Palette (non-fatal; mock provides it precomputed).
  const rt = await getRottenTomatoes(env, detail.imdb_id);
  const { rt_score, critic_score } = resolveCriticScore({ rt, tmdbVote: detail.tmdb_vote, mediaType: media_type });
  const palette = detail.palette ?? (await extractPalette(detail.poster_path));

  const ts = now();

  // 4. Upsert the title (shared across audiences); refresh enrichment on conflict.
  const titleRow = await DB.prepare(
    `INSERT INTO titles
       (tmdb_id, imdb_id, media_type, name, overview, poster_path, backdrop_path,
        art_palette, first_air, runtime, genres, networks, tmdb_vote, rt_score,
        critic_score, rt_checked_at, created_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
     ON CONFLICT(tmdb_id, media_type) DO UPDATE SET
       imdb_id=excluded.imdb_id, overview=excluded.overview, poster_path=excluded.poster_path,
       backdrop_path=excluded.backdrop_path, art_palette=excluded.art_palette,
       runtime=excluded.runtime, genres=excluded.genres, networks=excluded.networks,
       tmdb_vote=excluded.tmdb_vote, rt_score=excluded.rt_score,
       critic_score=excluded.critic_score, rt_checked_at=excluded.rt_checked_at
     RETURNING *`,
  )
    .bind(
      tmdb_id, detail.imdb_id, media_type, detail.name, detail.overview, detail.poster_path,
      detail.backdrop_path, JSON.stringify(palette), detail.first_air, detail.runtime,
      JSON.stringify(detail.genres), JSON.stringify(detail.networks), detail.tmdb_vote,
      rt_score, critic_score, rt ? ts : null, ts,
    )
    .first<Record<string, unknown>>();

  const titleId = titleRow!.id as number;

  // 5. Insert the entry (one per audience). Conflict = already tracked.
  const entryRow = await DB.prepare(
    `INSERT INTO entries (title_id, audience, state, notify, added_at, updated_at)
     VALUES (?1,?2,?3,1,?4,?4)
     ON CONFLICT(title_id, audience) DO NOTHING
     RETURNING *`,
  )
    .bind(titleId, audience, state, ts)
    .first<Record<string, unknown>>();

  if (!entryRow) {
    return json({ error: { code: "bad_request", message: "Already in this list" } }, 409);
  }

  // 6. Seed episodes (TV) or releases (film).
  if (media_type === "tv" && detail.episodes.length) {
    const stmt = DB.prepare(
      `INSERT OR IGNORE INTO episodes (title_id, season, number, name, air_date)
       VALUES (?1,?2,?3,?4,?5)`,
    );
    await DB.batch(detail.episodes.map((e) => stmt.bind(titleId, e.season, e.number, e.name, e.air_date)));
  } else if (media_type === "movie" && detail.providers.length) {
    const rel = DB.prepare(
      `INSERT OR IGNORE INTO releases (title_id, provider, release_date) VALUES (?1,?2,?3)`,
    );
    await DB.batch(
      detail.providers.map((p) => rel.bind(titleId, p, detail.first_air ?? ts.slice(0, 10))),
    );
  }

  return json({ title: mapTitleRow(titleRow!), entry: mapEntryRow(entryRow) }, 201);
};

// ── row mappers ─────────────────────────────────────────────────────────────
function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string") return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

function mapTitleRow(r: Record<string, unknown>) {
  return {
    id: r.id, tmdb_id: r.tmdb_id, imdb_id: r.imdb_id, media_type: r.media_type,
    name: r.name, overview: r.overview, poster_path: r.poster_path, backdrop_path: r.backdrop_path,
    art_palette: parseJson(r.art_palette, null), first_air: r.first_air, runtime: r.runtime,
    genres: parseJson(r.genres, [] as string[]), networks: parseJson(r.networks, [] as string[]),
    tmdb_vote: r.tmdb_vote, rt_score: r.rt_score, critic_score: r.critic_score,
  };
}

function mapEntryRow(r: Record<string, unknown>) {
  return {
    id: r.id, title_id: r.title_id, audience: r.audience, state: r.state,
    notify: !!r.notify, added_at: r.added_at, updated_at: r.updated_at,
  };
}

function mapLibraryRow(r: Record<string, unknown>) {
  const total = Number(r.ep_total ?? 0);
  const watched = Number(r.ep_watched ?? 0);
  const title = mapTitleRow(r);
  const network = title.networks[0] ?? null;

  // Soonest future episode (TV) or release (movie) → the Coming Up countdown.
  let upcoming: { date: string; label: string; where: string | null } | null = null;
  if (r.media_type === "tv" && r.next_air) {
    const [s, n] = String(r.next_air_ep ?? "|").split("|");
    upcoming = { date: String(r.next_air), label: s && n ? `Season ${s}, Episode ${n}` : "New episode", where: network };
  } else if (r.media_type === "movie" && r.next_rel) {
    upcoming = { date: String(r.next_rel), label: "New on " + (r.next_rel_provider ?? "streaming"), where: (r.next_rel_provider as string) ?? null };
  }

  // Next unwatched, already-aired episode → the Keep Going "next episode" label.
  let nextWatch: { season: number; number: number; name: string | null } | null = null;
  if (typeof r.next_unwatched === "string") {
    const [s, n, name] = r.next_unwatched.split("|");
    nextWatch = { season: Number(s), number: Number(n), name: name || null };
  }

  return {
    entry: {
      id: r.entry_id, title_id: r.id, audience: r.audience, state: r.state,
      notify: !!r.notify, added_at: r.added_at, updated_at: r.updated_at,
    },
    title,
    progress: r.media_type === "tv" ? { watched, total } : null,
    upcoming,
    nextWatch,
    where: network,
  };
}
