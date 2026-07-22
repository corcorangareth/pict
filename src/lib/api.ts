import type { Audience, EntryState, MediaType, Title, Entry } from "@/types";

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

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as any)?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  search: (q: string) =>
    req<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`).then((d) => d.results),

  getLibrary: () => req<{ library: LibraryItem[] }>("/api/titles").then((d) => d.library),

  addTitle: (payload: { tmdb_id: number; media_type: MediaType; audience: Audience; state?: EntryState }) =>
    req<{ title: Title; entry: Entry }>("/api/titles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
