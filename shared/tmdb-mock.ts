import type { Env } from "./env";
import type { MediaType, TmdbDetail, TmdbEpisode, TmdbSearchResult, Palette } from "./tmdb";

// Fixture-backed TMDB. Active whenever TMDB_TOKEN is empty (BUILD.md §11 / dev).
// Drops out automatically once a real v4 read token is set. Palettes are
// precomputed here so the add flow produces real moods without live extraction.

export function isMockMode(env: Env): boolean {
  return !env.TMDB_TOKEN || env.TMDB_TOKEN.trim() === "";
}

interface MockTitle {
  tmdb_id: number;
  media_type: MediaType;
  name: string;
  year: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  imdb_id: string;
  runtime: number;
  genres: string[];
  networks: string[];
  tmdb_vote: number;
  palette: Palette;
  providers: string[];
  seasons?: { season: number; episodes: { number: number; name: string; air_date: string }[] }[];
}

const inDays = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const CATALOG: MockTitle[] = [
  {
    tmdb_id: 500101, media_type: "tv", name: "The Salt Road", year: "2025",
    overview: "Two smugglers cross a shifting desert border, one favour at a time.",
    poster_path: "/salt.jpg", backdrop_path: "/salt-bd.jpg", imdb_id: "tt5001010",
    runtime: 51, genres: ["Drama", "Adventure"], networks: ["Apple TV+"], tmdb_vote: 8.6,
    palette: { base: "#231B08", a: "#E8CE5E", b: "#7A5E14", c: "#FBF0C0", tint: "#DCC97F" },
    providers: ["Apple TV+"],
    seasons: [{ season: 1, episodes: [
      { number: 1, name: "Crossing", air_date: inDays(-14) },
      { number: 2, name: "Ledger", air_date: inDays(-7) },
      { number: 3, name: "Border Weather", air_date: inDays(2) },
      { number: 4, name: "The Long Way", air_date: inDays(9) },
    ] }],
  },
  {
    tmdb_id: 500102, media_type: "movie", name: "Under Two Moons", year: "2026",
    overview: "A lunar colony botanist races an eclipse to save the last greenhouse.",
    poster_path: "/moons.jpg", backdrop_path: "/moons-bd.jpg", imdb_id: "tt5001020",
    runtime: 124, genres: ["Science Fiction", "Drama"], networks: ["Netflix"], tmdb_vote: 7.8,
    palette: { base: "#1A1030", a: "#9D7BF0", b: "#3B2478", c: "#DCCDFF", tint: "#B8A3F2" },
    providers: ["Netflix"],
  },
  {
    tmdb_id: 500103, media_type: "tv", name: "Nightglass", year: "2024",
    overview: "A glassblower in a coastal town inherits a workshop that remembers.",
    poster_path: "/night.jpg", backdrop_path: "/night-bd.jpg", imdb_id: "tt5001030",
    runtime: 47, genres: ["Mystery", "Drama"], networks: ["Sky"], tmdb_vote: 8.1,
    palette: { base: "#22101B", a: "#E578A6", b: "#7A1F49", c: "#FFD3E4", tint: "#DFA0BC" },
    providers: ["Sky"],
    seasons: [{ season: 1, episodes: [
      { number: 1, name: "Anneal", air_date: inDays(-3) },
      { number: 2, name: "Gather", air_date: inDays(4) },
    ] }],
  },
  {
    tmdb_id: 500104, media_type: "movie", name: "Harbour Lights", year: "2024",
    overview: "Three generations of a fishing family gather for one last summer.",
    poster_path: "/harbour.jpg", backdrop_path: "/harbour-bd.jpg", imdb_id: "tt5001040",
    runtime: 108, genres: ["Drama", "Family"], networks: ["Disney+"], tmdb_vote: 7.4,
    palette: { base: "#0E2418", a: "#63C98E", b: "#14563A", c: "#CFF0DC", tint: "#8FCFA9" },
    providers: ["Disney+"],
  },
  {
    tmdb_id: 500105, media_type: "tv", name: "Brightwater Bay", year: "2024",
    overview: "A gentle village mystery where nothing worse than a stolen boat happens.",
    poster_path: "/bright.jpg", backdrop_path: "/bright-bd.jpg", imdb_id: "tt5001050",
    runtime: 44, genres: ["Comedy", "Mystery"], networks: ["RTÉ"], tmdb_vote: 7.9,
    palette: { base: "#101A22", a: "#8FB4CC", b: "#2A4356", c: "#D9E8F0", tint: "#A9C4D6" },
    providers: ["RTÉ Player"],
    seasons: [{ season: 1, episodes: [
      { number: 1, name: "The Missing Currach", air_date: inDays(-20) },
      { number: 2, name: "Low Tide", air_date: inDays(-13) },
      { number: 3, name: "The Regatta", air_date: inDays(1) },
    ] }],
  },
  {
    tmdb_id: 500106, media_type: "movie", name: "Winter Signal", year: "2025",
    overview: "A radio astronomer picks up a transmission that shouldn't exist.",
    poster_path: "/winter.jpg", backdrop_path: "/winter-bd.jpg", imdb_id: "tt5001060",
    runtime: 118, genres: ["Thriller", "Science Fiction"], networks: ["Apple TV+"], tmdb_vote: 8.3,
    palette: { base: "#0A2530", a: "#4FD1C5", b: "#0E5E7A", c: "#BCF3EA", tint: "#7FD8D0" },
    providers: ["Apple TV+"],
  },
];

export function mockSearch(q: string): TmdbSearchResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return CATALOG.filter((t) => t.name.toLowerCase().includes(needle)).map((t) => ({
    tmdb_id: t.tmdb_id,
    media_type: t.media_type,
    name: t.name,
    year: t.year,
    poster_path: t.poster_path,
    overview: t.overview,
  }));
}

export function mockDetail(tmdbId: number, mediaType: MediaType): TmdbDetail {
  const t = CATALOG.find((x) => x.tmdb_id === tmdbId && x.media_type === mediaType);
  if (!t) throw new Error(`mock: unknown title ${tmdbId}/${mediaType}`);

  const episodes: TmdbEpisode[] = (t.seasons ?? []).flatMap((s) =>
    s.episodes.map((e) => ({ season: s.season, number: e.number, name: e.name, air_date: e.air_date })),
  );

  return {
    tmdb_id: t.tmdb_id,
    imdb_id: t.imdb_id,
    media_type: t.media_type,
    name: t.name,
    overview: t.overview,
    poster_path: t.poster_path,
    backdrop_path: t.backdrop_path,
    first_air: mediaType === "tv" ? inDays(-30) : inDays(-2),
    runtime: t.runtime,
    genres: t.genres,
    networks: t.networks,
    tmdb_vote: t.tmdb_vote,
    episodes,
    providers: t.providers,
    palette: t.palette,
  };
}
