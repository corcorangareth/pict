import { z } from "zod";
import type { Env } from "./env";
import type { MediaType } from "./tmdb";
import { HAIKU_MODEL, REGION, CRITIC_DEFAULT } from "./constants";

// ─── AI suggestion pipeline (BUILD.md §7) ─────────────────────────────────────
// Build a taste profile from finished/caught-up titles → discover candidates →
// hard-filter by critic threshold → Haiku ranks + writes reasons → cache to D1.
// Never throws user-visible errors: on any failure, degrades to a deterministic
// top-by-critic-score fallback so Discover always renders something.

type Audience = "me" | "us" | "family";

interface FinishedTitle {
  title_id: number;
  tmdb_id: number;
  media_type: MediaType;
  name: string;
  genres: string[];
  first_air: string | null;
  runtime: number | null;
  networks: string[];
  audience: Audience;
}

interface TasteProfile {
  finished: FinishedTitle[];
  genres_top: string[];
  decades_top: string[];
  avg_runtime_min: number | null;
  networks_top: string[];
  audience_top: Audience;
}

export interface Candidate {
  tmdb_id: number;
  media_type: MediaType;
  name: string;
  poster_path: string | null;
  overview: string | null;
  genres: string[];
  year: string | null;
  runtime_min: number | null;
  critic_score: number;
  rt_score: number | null;
  tmdb_vote: number | null;
}

export interface Suggestion {
  tmdb_id: number;
  media_type: MediaType;
  audience: Audience;
  name: string;
  poster_path: string | null;
  overview: string | null;
  critic_score: number;
  rt_score: number | null;
  reason: string;
  meta: { year: string | null; runtime_min: number | null; genres: string[] };
}

const SuggestionOut = z.object({
  tmdb_id: z.number().int(),
  media_type: z.enum(["movie", "tv"]),
  audience: z.enum(["me", "us", "family"]),
  reason: z.string().min(1).max(160),
});
const HaikuResponse = z.object({ suggestions: z.array(SuggestionOut).min(1).max(8) });

// ─── Public entry points ──────────────────────────────────────────────────────
export async function regenerateSuggestions(env: Env): Promise<Suggestion[]> {
  const threshold = await getCriticThreshold(env);
  const profile = await buildTasteProfile(env);
  if (!profile.finished.length) {
    await writeSuggestions(env, []);
    return [];
  }
  const candidates = await discoverCandidates(env, profile);
  const filtered = candidates.filter((c) => c.critic_score >= threshold).slice(0, 30);
  if (!filtered.length) {
    await writeSuggestions(env, []);
    return [];
  }
  const chosen = await rankWithHaiku(env, profile, filtered);
  await writeSuggestions(env, chosen);
  return chosen;
}

export async function readSuggestionsCache(env: Env): Promise<{ suggestions: Suggestion[]; generated_at: string | null }> {
  const rows = await env.DB.prepare(
    `SELECT payload, generated_at FROM suggestions ORDER BY id ASC`,
  ).all<{ payload: string; generated_at: string }>();
  const list = (rows.results ?? [])
    .map((r) => {
      try {
        return JSON.parse(r.payload) as Suggestion;
      } catch {
        return null;
      }
    })
    .filter((s): s is Suggestion => !!s);
  const generated_at = rows.results?.[0]?.generated_at ?? null;
  return { suggestions: list, generated_at };
}

// ─── Taste profile ────────────────────────────────────────────────────────────
async function buildTasteProfile(env: Env): Promise<TasteProfile> {
  // Eligible (§0.2): finished films OR (TV completed OR caught-up).
  const rows = await env.DB.prepare(
    `SELECT t.id AS title_id, t.tmdb_id, t.media_type, t.name, t.genres, t.first_air,
            t.runtime, t.networks, e.audience
       FROM entries e JOIN titles t ON t.id = e.title_id
       WHERE e.state = 'completed'
          OR (e.state = 'watching' AND t.media_type = 'tv' AND e.caught_up_at IS NOT NULL)`,
  ).all<Record<string, unknown>>();

  const finished: FinishedTitle[] = (rows.results ?? []).map((r) => ({
    title_id: r.title_id as number,
    tmdb_id: r.tmdb_id as number,
    media_type: r.media_type as MediaType,
    name: r.name as string,
    genres: safeJson<string[]>(r.genres, []),
    first_air: (r.first_air as string) ?? null,
    runtime: (r.runtime as number) ?? null,
    networks: safeJson<string[]>(r.networks, []),
    audience: (r.audience as Audience) ?? "me",
  }));

  return {
    finished,
    genres_top: topCounts(finished.flatMap((f) => f.genres), 3),
    decades_top: topCounts(finished.map((f) => decade(f.first_air)).filter((d): d is string => !!d), 2),
    avg_runtime_min: avg(finished.map((f) => f.runtime).filter((n): n is number => typeof n === "number")),
    networks_top: topCounts(finished.flatMap((f) => f.networks), 3),
    audience_top: topCounts(finished.map((f) => f.audience), 1)[0] as Audience ?? "me",
  };
}

function decade(iso: string | null): string | null {
  if (!iso) return null;
  const y = parseInt(iso.slice(0, 4), 10);
  if (!Number.isFinite(y)) return null;
  return `${Math.floor(y / 10) * 10}s`;
}

function topCounts<T extends string>(arr: T[], n: number): T[] {
  const c = new Map<T, number>();
  for (const x of arr) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
}

// ─── Candidates ───────────────────────────────────────────────────────────────
async function discoverCandidates(env: Env, profile: TasteProfile): Promise<Candidate[]> {
  const excluded = await excludedTmdbIds(env);
  const [movieGenres, tvGenres] = await Promise.all([genreMap(env, "movie"), genreMap(env, "tv")]);

  const movieIds = profile.genres_top.map((n) => movieGenres.get(n)).filter((x): x is number => !!x);
  const tvIds = profile.genres_top.map((n) => tvGenres.get(n)).filter((x): x is number => !!x);

  const pool: Candidate[] = [];
  const push = (list: Candidate[]) => {
    for (const c of list) {
      const key = `${c.media_type}:${c.tmdb_id}`;
      if (excluded.has(key)) continue;
      if (pool.find((p) => p.tmdb_id === c.tmdb_id && p.media_type === c.media_type)) continue;
      pool.push(c);
    }
  };

  // Discover by seeded genres.
  if (movieIds.length) push(await tmdbDiscover(env, "movie", movieIds, movieGenres));
  if (tvIds.length) push(await tmdbDiscover(env, "tv", tvIds, tvGenres));

  // Recommendations seeded from a few recent finished titles.
  const seeds = profile.finished.slice(0, 4);
  for (const s of seeds) {
    try {
      const recs = await tmdbRecommendations(env, s, s.media_type === "movie" ? movieGenres : tvGenres);
      push(recs);
    } catch {
      /* skip a bad seed */
    }
  }
  return pool;
}

async function excludedTmdbIds(env: Env): Promise<Set<string>> {
  // Everything already in the library, including abandoned — never re-suggest.
  const rows = await env.DB.prepare(`SELECT DISTINCT tmdb_id, media_type FROM titles`).all<{
    tmdb_id: number;
    media_type: MediaType;
  }>();
  const set = new Set<string>();
  for (const r of rows.results ?? []) set.add(`${r.media_type}:${r.tmdb_id}`);
  return set;
}

async function tmdbDiscover(
  env: Env,
  media: MediaType,
  genreIds: number[],
  genreMap: Map<string, number>,
): Promise<Candidate[]> {
  const params: Record<string, string> = {
    language: "en-US",
    sort_by: "popularity.desc",
    include_adult: "false",
    watch_region: REGION,
    with_watch_monetization_types: "flatrate",
    with_genres: genreIds.slice(0, 3).join(","),
    "vote_count.gte": "50",
    page: "1",
  };
  const data = await tmdb<{ results: any[] }>(env, `/discover/${media}`, params);
  return (data.results ?? []).slice(0, 12).map((r) => normaliseTmdbRow(r, media, genreMap));
}

async function tmdbRecommendations(
  env: Env,
  seed: { tmdb_id: number; media_type: MediaType },
  genreMap: Map<string, number>,
): Promise<Candidate[]> {
  const data = await tmdb<{ results: any[] }>(env, `/${seed.media_type}/${seed.tmdb_id}/recommendations`, {
    language: "en-US",
    page: "1",
  });
  return (data.results ?? []).slice(0, 8).map((r) => normaliseTmdbRow(r, seed.media_type, genreMap));
}

function normaliseTmdbRow(r: any, media: MediaType, genreMap: Map<string, number>): Candidate {
  const name = r.title ?? r.name ?? "Untitled";
  const date = r.release_date ?? r.first_air_date ?? null;
  const vote = typeof r.vote_average === "number" ? r.vote_average : null;
  const critic_score = vote != null ? Math.round(vote * 10) : 0;
  const genres = genresFromIds(r.genre_ids ?? [], genreMap);
  return {
    tmdb_id: r.id,
    media_type: media,
    name,
    poster_path: r.poster_path ?? null,
    overview: r.overview ?? null,
    genres,
    year: date ? date.slice(0, 4) : null,
    runtime_min: null,
    critic_score,
    rt_score: null,
    tmdb_vote: vote,
  };
}

function genresFromIds(ids: number[], map: Map<string, number>): string[] {
  const flipped = new Map<number, string>();
  for (const [name, id] of map) flipped.set(id, name);
  return ids.map((id) => flipped.get(id)).filter((n): n is string => !!n);
}

const GENRE_CACHE: Partial<Record<MediaType, Map<string, number>>> = {};
async function genreMap(env: Env, media: MediaType): Promise<Map<string, number>> {
  if (GENRE_CACHE[media]) return GENRE_CACHE[media]!;
  const data = await tmdb<{ genres: { id: number; name: string }[] }>(
    env,
    `/genre/${media}/list`,
    { language: "en-US" },
  );
  const map = new Map<string, number>();
  for (const g of data.genres ?? []) map.set(g.name, g.id);
  GENRE_CACHE[media] = map;
  return map;
}

async function tmdb<T>(env: Env, path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.TMDB_TOKEN}`, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// ─── Haiku ranking ────────────────────────────────────────────────────────────
async function rankWithHaiku(env: Env, profile: TasteProfile, candidates: Candidate[]): Promise<Suggestion[]> {
  if (!env.ANTHROPIC_API_KEY) return fallbackRanking(profile, candidates);

  const payload = {
    profile: {
      finished: profile.finished.slice(0, 20).map((f) => ({
        name: f.name,
        genres: f.genres,
        decade: decade(f.first_air),
        audience: f.audience,
      })),
      genres_top: profile.genres_top,
      decades_top: profile.decades_top,
      avg_runtime_min: profile.avg_runtime_min,
      networks_top: profile.networks_top,
    },
    candidates: candidates.map((c) => ({
      tmdb_id: c.tmdb_id,
      media_type: c.media_type,
      name: c.name,
      genres: c.genres,
      year: c.year,
      critic_score: c.critic_score,
      runtime_min: c.runtime_min,
    })),
    count: 8,
  };

  const system =
    "You are the recommendation engine for Pict, a personal TV-and-film tracker for one user in Ireland. " +
    "You will be given the user's taste profile (built only from titles they have FINISHED or are fully caught up on) " +
    "and a list of candidate titles that have already passed a critic-score filter. " +
    "Choose the 8 best candidates for this user and, for each, write one short reason.\n\n" +
    "Hard rules:\n" +
    "- Choose ONLY from the provided candidates. Never invent a title or use one not in the list.\n" +
    "- Every reason MUST name a specific title the user finished — e.g. \"Because you finished Cliffhold\" — never vague genre talk.\n" +
    "- Each reason is at most 90 characters, warm and plain, no marketing tone.\n" +
    "- Pick a suggested audience for each from {me, us, family}, based on which lists its most-similar finished titles came from.\n" +
    "- Return JSON ONLY, matching: {\"suggestions\":[{\"tmdb_id\":int,\"media_type\":\"movie\"|\"tv\",\"audience\":\"me\"|\"us\"|\"family\",\"reason\":string},...]}\n" +
    "- No prose, no markdown, no code fences.";

  const first = await callHaiku(env, system, JSON.stringify(payload));
  const parsed = parseHaiku(first);
  if (parsed) return hydrate(parsed, candidates, profile);

  // One retry with a corrective nudge.
  const retry = await callHaiku(
    env,
    system,
    JSON.stringify(payload) + "\n\nYour previous reply was invalid JSON. Return only the JSON object.",
  );
  const reparsed = parseHaiku(retry);
  if (reparsed) return hydrate(reparsed, candidates, profile);

  return fallbackRanking(profile, candidates);
}

async function callHaiku(env: Env, system: string, userJson: string): Promise<string> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 1024,
        temperature: 0.4,
        system,
        messages: [{ role: "user", content: userJson }],
      }),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  } catch {
    return "";
  }
}

function parseHaiku(text: string): z.infer<typeof HaikuResponse> | null {
  if (!text) return null;
  // Strip accidental fences / prose around the JSON object.
  const cleaned = stripToJson(text);
  try {
    const parsed = JSON.parse(cleaned);
    const result = HaikuResponse.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function stripToJson(text: string): string {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first < 0 || last < 0 || last < first) return trimmed;
  return trimmed.slice(first, last + 1);
}

function hydrate(
  parsed: z.infer<typeof HaikuResponse>,
  candidates: Candidate[],
  profile: TasteProfile,
): Suggestion[] {
  const byKey = new Map<string, Candidate>();
  for (const c of candidates) byKey.set(`${c.media_type}:${c.tmdb_id}`, c);

  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const s of parsed.suggestions) {
    const key = `${s.media_type}:${s.tmdb_id}`;
    if (seen.has(key)) continue;
    const c = byKey.get(key);
    if (!c) continue; // model hallucinated — drop
    seen.add(key);
    out.push({
      tmdb_id: c.tmdb_id,
      media_type: c.media_type,
      audience: s.audience,
      name: c.name,
      poster_path: c.poster_path,
      overview: c.overview,
      critic_score: c.critic_score,
      rt_score: c.rt_score,
      reason: truncateAtWord(s.reason, 90),
      meta: { year: c.year, runtime_min: c.runtime_min, genres: c.genres },
    });
    if (out.length >= 8) break;
  }
  // Backfill up to 8 from the fallback ranking if the model returned too few.
  if (out.length < 8) {
    for (const s of fallbackRanking(profile, candidates)) {
      const key = `${s.media_type}:${s.tmdb_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 8) break;
    }
  }
  return out;
}

function truncateAtWord(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return (cut > max * 0.6 ? slice.slice(0, cut) : slice).replace(/[,;:—-]\s*$/, "") + "…";
}

// Deterministic fallback: sort by critic_score, reason = closest finished title.
function fallbackRanking(profile: TasteProfile, candidates: Candidate[]): Suggestion[] {
  const sorted = [...candidates].sort((a, b) => b.critic_score - a.critic_score);
  const audienceDefault = profile.audience_top;
  return sorted.slice(0, 8).map((c) => {
    const closest = closestFinished(c, profile.finished);
    return {
      tmdb_id: c.tmdb_id,
      media_type: c.media_type,
      audience: closest?.audience ?? audienceDefault,
      name: c.name,
      poster_path: c.poster_path,
      overview: c.overview,
      critic_score: c.critic_score,
      rt_score: c.rt_score,
      reason: closest ? `Similar to ${closest.name}` : "Highly rated in your favourite genres",
      meta: { year: c.year, runtime_min: c.runtime_min, genres: c.genres },
    };
  });
}

function closestFinished(c: Candidate, finished: FinishedTitle[]): FinishedTitle | null {
  let best: FinishedTitle | null = null;
  let bestOverlap = 0;
  for (const f of finished) {
    if (f.media_type !== c.media_type) continue;
    const overlap = f.genres.filter((g) => c.genres.includes(g)).length;
    if (overlap > bestOverlap) {
      best = f;
      bestOverlap = overlap;
    }
  }
  return best ?? finished[0] ?? null;
}

// ─── Cache write ──────────────────────────────────────────────────────────────
async function writeSuggestions(env: Env, list: Suggestion[]): Promise<void> {
  await env.DB.prepare(`DELETE FROM suggestions`).run();
  if (!list.length) return;
  const ts = new Date().toISOString();
  const stmt = env.DB.prepare(
    `INSERT INTO suggestions (tmdb_id, media_type, audience, payload, generated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  );
  await env.DB.batch(list.map((s) => stmt.bind(s.tmdb_id, s.media_type, s.audience, JSON.stringify(s), ts)));
}

async function getCriticThreshold(env: Env): Promise<number> {
  const row = await env.DB.prepare(`SELECT critic_threshold FROM settings WHERE id = 1`).first<{
    critic_threshold: number;
  }>();
  return row?.critic_threshold ?? CRITIC_DEFAULT;
}

function safeJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string") return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
