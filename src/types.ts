// Shared client types. Mirror the D1 schema (BUILD.md §2) where relevant.

export type MediaType = "tv" | "movie";
export type Audience = "me" | "us" | "family";
export type EntryState = "saved" | "watching" | "completed" | "abandoned";

export interface Palette {
  base: string;
  a: string;
  b: string;
  c: string;
  tint: string;
}

export interface Title {
  id: number;
  tmdb_id: number;
  imdb_id: string | null;
  media_type: MediaType;
  name: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  art_palette: Palette | null;
  first_air: string | null;
  runtime: number | null;
  genres: string[];
  networks: string[];
  tmdb_vote: number | null;
  rt_score: number | null;
  critic_score: number;
}

export interface Entry {
  id: number;
  title_id: number;
  audience: Audience;
  state: EntryState;
  notify: boolean;
  added_at: string;
  updated_at: string;
}

export interface Episode {
  id: number;
  title_id: number;
  season: number;
  number: number;
  name: string | null;
  air_date: string | null;
  watched_at: string | null;
}

export interface Release {
  id: number;
  title_id: number;
  provider: string | null;
  release_date: string;
}

export interface Suggestion {
  tmdb_id: number;
  media_type: MediaType;
  audience: Audience;
  name: string;
  poster_path: string | null;
  rt_score: number | null;
  critic_score: number;
  reason: string;
  meta: string;
}

export interface Settings {
  critic_threshold: number;
  soft_prompt_seen: boolean;
}

export type Tab = "home" | "discover" | "cal" | "me";
