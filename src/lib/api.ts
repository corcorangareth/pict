import type { Audience, EntryState, MediaType, Title, Entry, Episode, Release } from "@/types";

export interface SearchResult {
  tmdb_id: number;
  media_type: MediaType;
  name: string;
  year: string | null;
  poster_path: string | null;
  overview: string | null;
}

export interface LibraryItem {
  entry: Entry;
  title: Title;
  progress: { watched: number; total: number } | null;
  upcoming: { date: string; label: string; where: string | null } | null;
  nextWatch: { season: number; number: number; name: string | null } | null;
  where: string | null;
}

export interface Season {
  season: number;
  episodes: Episode[];
}

export interface TitleDetailData {
  title: Title;
  entries: Entry[];
  seasons: Season[];
  releases: Release[];
}

export interface ProgressPayload {
  entryId: number;
  titleId: number;
  season?: number;
  episode?: number;
  all?: boolean;
  airedOnly?: boolean;
  watched?: boolean;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  // Session expired / locked — tell the app to show the unlock screen.
  if (res.status === 401) {
    window.dispatchEvent(new Event("pict:locked"));
    throw new Error("Locked");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as any)?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  // Auth. session() resolves true if the current cookie is valid.
  session: () =>
    fetch("/api/session").then((r) => r.ok),
  login: (password: string) =>
    fetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).then((r) => r.ok),

  search: (q: string) =>
    req<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`).then((d) => d.results),

  getLibrary: () => req<{ library: LibraryItem[] }>("/api/titles").then((d) => d.library),

  addTitle: (payload: { tmdb_id: number; media_type: MediaType; audience: Audience; state?: EntryState }) =>
    req<{ title: Title; entry: Entry }>("/api/titles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTitle: (id: number) => req<TitleDetailData>(`/api/titles/${id}`),

  markProgress: (payload: ProgressPayload) =>
    req<{ updated: number; entryState: EntryState }>("/api/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateEntry: (id: number, patch: { state?: EntryState; audience?: Audience; notify?: boolean }) =>
    req<{ entry: Entry }>(`/api/entries/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteEntry: (id: number) => req<{ ok: true }>(`/api/entries/${id}`, { method: "DELETE" }),
};
