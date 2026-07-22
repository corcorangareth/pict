import type { Env } from "./env";

// OMDb critic lookup by IMDb id (BUILD.md §5). Returns the Rotten Tomatoes
// percentage as an integer, or null when unavailable / N/A / on any error.
export async function getRottenTomatoes(env: Env, imdbId: string | null): Promise<number | null> {
  if (!imdbId || !env.OMDB_KEY) return null;
  try {
    const url = new URL("https://www.omdbapi.com/");
    url.searchParams.set("i", imdbId);
    url.searchParams.set("apikey", env.OMDB_KEY);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { Ratings?: { Source: string; Value: string }[] };
    const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
    if (!rt) return null;
    const n = parseInt(rt.Value.replace("%", ""), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
