// D1 row mappers shared across Functions. Parse JSON columns, coerce booleans.

export function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string") return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function mapTitleRow(r: Record<string, unknown>) {
  return {
    id: r.id as number,
    tmdb_id: r.tmdb_id as number,
    imdb_id: (r.imdb_id as string) ?? null,
    media_type: r.media_type as "tv" | "movie",
    name: r.name as string,
    overview: (r.overview as string) ?? null,
    poster_path: (r.poster_path as string) ?? null,
    backdrop_path: (r.backdrop_path as string) ?? null,
    art_palette: parseJson(r.art_palette, null as null | Record<string, string>),
    first_air: (r.first_air as string) ?? null,
    runtime: (r.runtime as number) ?? null,
    genres: parseJson(r.genres, [] as string[]),
    networks: parseJson(r.networks, [] as string[]),
    tmdb_vote: (r.tmdb_vote as number) ?? null,
    rt_score: (r.rt_score as number) ?? null,
    critic_score: r.critic_score as number,
  };
}

export function mapEntryRow(r: Record<string, unknown>) {
  return {
    id: r.id as number,
    title_id: r.title_id as number,
    audience: r.audience as "me" | "us" | "family",
    state: r.state as "saved" | "watching" | "completed" | "abandoned",
    notify: !!r.notify,
    added_at: r.added_at as string,
    updated_at: r.updated_at as string,
  };
}

export function mapEpisodeRow(r: Record<string, unknown>) {
  return {
    id: r.id as number,
    title_id: r.title_id as number,
    season: r.season as number,
    number: r.number as number,
    name: (r.name as string) ?? null,
    air_date: (r.air_date as string) ?? null,
    watched_at: (r.watched_at as string) ?? null,
  };
}

export function mapReleaseRow(r: Record<string, unknown>) {
  return {
    id: r.id as number,
    title_id: r.title_id as number,
    provider: (r.provider as string) ?? null,
    release_date: r.release_date as string,
  };
}
