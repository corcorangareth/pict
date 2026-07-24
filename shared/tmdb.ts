import type { Env } from "./env";
import { REGION } from "./constants";
import { mockSearch, mockDetail, isMockMode } from "./tmdb-mock";

export type MediaType = "tv" | "movie";

export interface Palette {
  base: string;
  a: string;
  b: string;
  c: string;
  tint: string;
}

export interface TmdbSearchResult {
  tmdb_id: number;
  media_type: MediaType;
  name: string;
  year: string | null;
  poster_path: string | null;
  overview: string | null;
}

export interface TmdbEpisode {
  season: number;
  number: number;
  name: string | null;
  air_date: string | null;
}

export interface TmdbDetail {
  tmdb_id: number;
  imdb_id: string | null;
  media_type: MediaType;
  name: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air: string | null;
  runtime: number | null;
  genres: string[];
  networks: string[];
  tmdb_vote: number | null;
  episodes: TmdbEpisode[];
  providers: string[];
  /** Precomputed palette (mock only); real mode extracts server-side. */
  palette?: Palette;
}

const BASE = "https://api.themoviedb.org/3";

async function tmdb<T>(env: Env, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.TMDB_TOKEN}`, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// ── Search ────────────────────────────────────────────────────────────────
export async function searchMulti(env: Env, q: string): Promise<TmdbSearchResult[]> {
  if (isMockMode(env)) return mockSearch(q);

  const data = await tmdb<{ results: any[] }>(env, "/search/multi", {
    query: q,
    include_adult: "false",
    language: "en-US",
  });
  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => {
      const name = r.title ?? r.name;
      const date = r.release_date ?? r.first_air_date ?? "";
      return {
        tmdb_id: r.id,
        media_type: r.media_type as MediaType,
        name,
        year: date ? date.slice(0, 4) : null,
        poster_path: r.poster_path ?? null,
        overview: r.overview ?? null,
      };
    });
}

// ── Detail (for add) ──────────────────────────────────────────────────────
export async function getDetail(env: Env, tmdbId: number, mediaType: MediaType): Promise<TmdbDetail> {
  if (isMockMode(env)) return mockDetail(tmdbId, mediaType);

  const append = mediaType === "movie" ? "external_ids,watch/providers,release_dates" : "external_ids,watch/providers";
  const d = await tmdb<any>(env, `/${mediaType}/${tmdbId}`, { append_to_response: append, language: "en-US" });

  const providers = extractProviders(d["watch/providers"]);
  const episodes = mediaType === "tv" ? await fetchEpisodes(env, tmdbId, d.seasons ?? []) : [];

  // Prefer the Irish (IE) release date for films; fall back to the global one.
  let firstAir: string | null = d.release_date ?? d.first_air_date ?? null;
  if (mediaType === "movie") firstAir = ieReleaseDate(d.release_dates) ?? firstAir;

  return {
    tmdb_id: tmdbId,
    imdb_id: d.external_ids?.imdb_id ?? d.imdb_id ?? null,
    media_type: mediaType,
    name: d.title ?? d.name,
    overview: d.overview ?? null,
    poster_path: d.poster_path ?? null,
    backdrop_path: d.backdrop_path ?? null,
    first_air: firstAir,
    runtime: d.runtime ?? d.episode_run_time?.[0] ?? null,
    genres: (d.genres ?? []).map((g: any) => g.name),
    networks: (d.networks ?? d.production_companies ?? []).map((n: any) => n.name).slice(0, 4),
    tmdb_vote: typeof d.vote_average === "number" ? d.vote_average : null,
    episodes,
    providers,
  };
}

// Pick the Ireland release date from TMDB release_dates. Prefer theatrical, then
// digital, then any — returns YYYY-MM-DD, or null if IE has no release listed.
function ieReleaseDate(releaseDates: any): string | null {
  const ie = releaseDates?.results?.find((r: any) => r.iso_3166_1 === REGION);
  const list: any[] = ie?.release_dates ?? [];
  if (!list.length) return null;
  const byType = (t: number) => list.find((x) => x.type === t)?.release_date;
  // 3 = theatrical, 4 = digital, 2 = theatrical (limited), 1 = premiere
  const chosen = byType(3) ?? byType(4) ?? byType(2) ?? byType(1) ?? list[0]?.release_date;
  return chosen ? chosen.slice(0, 10) : null;
}

function extractProviders(wp: any): string[] {
  const ie = wp?.results?.[REGION];
  if (!ie?.flatrate) return [];
  return ie.flatrate.map((p: any) => p.provider_name);
}

// Current IE flatrate (subscription) providers for a title — used by the cron to
// detect when a film first lands on streaming.
export async function getWatchProviders(env: Env, tmdbId: number, mediaType: MediaType): Promise<string[]> {
  if (isMockMode(env)) {
    try {
      return mockDetail(tmdbId, mediaType).providers;
    } catch {
      return [];
    }
  }
  const d = await tmdb<any>(env, `/${mediaType}/${tmdbId}/watch/providers`);
  return extractProviders(d);
}

async function fetchEpisodes(env: Env, tvId: number, seasons: any[]): Promise<TmdbEpisode[]> {
  const out: TmdbEpisode[] = [];
  for (const s of seasons) {
    if (s.season_number === 0) continue; // skip specials
    const sd = await tmdb<any>(env, `/tv/${tvId}/season/${s.season_number}`, { language: "en-US" });
    for (const e of sd.episodes ?? []) {
      out.push({
        season: e.season_number,
        number: e.episode_number,
        name: e.name ?? null,
        air_date: e.air_date ?? null,
      });
    }
  }
  return out;
}
