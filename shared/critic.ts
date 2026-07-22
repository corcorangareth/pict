import type { MediaType } from "./tmdb";

// Unified "Critic score" (BUILD.md §0.1 / §5). Prefer real RT; fall back to
// TMDB vote_average scaled to 0–100. critic_score is never null (0 if unknown,
// which correctly clears no threshold).
export function resolveCriticScore(input: {
  rt: number | null;
  tmdbVote: number | null;
  mediaType: MediaType;
}): { rt_score: number | null; critic_score: number } {
  const rt_score = input.rt;
  const scaled = input.tmdbVote != null ? Math.round(input.tmdbVote * 10) : 0;
  const critic_score = rt_score ?? scaled;
  return { rt_score, critic_score };
}
