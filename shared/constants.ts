// Cross-cutting constants (BUILD.md §4.3, §7).
export const TMDB_IMG = "https://image.tmdb.org/t/p";

export const IMG_SIZE = {
  palette: "w154",
  poster: "w342",
  rail: "w500",
  hero: "w780",
  backdrop: "w1280",
} as const;

export const REGION = "IE";
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export const CRITIC_DEFAULT = 75;
export const CRITIC_MIN = 60;
export const CRITIC_MAX = 95;

export function img(path: string | null, size: keyof typeof IMG_SIZE): string | null {
  return path ? `${TMDB_IMG}/${IMG_SIZE[size]}${path}` : null;
}
