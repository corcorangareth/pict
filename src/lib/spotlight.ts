import { daysUntil } from "@/lib/countdown";
import type { LibraryItem } from "@/lib/api";
import type { MediaType } from "@/types";

// What earns a spot in the hero, and how it's shown there.
//  - "ready": something you can watch right now (a new/next episode is out, or a
//    film you've saved). The most prominent — it answers "what tonight?".
//  - "countdown": nothing to watch yet, but it's coming — show the day count.
export type Spotlight =
  | { kind: "ready"; primary: string; label: string }
  | { kind: "countdown"; days: number; label: string };

export interface HeroEntry {
  item: LibraryItem;
  spotlight: Spotlight;
}

export function spotlightFor(item: LibraryItem, media: MediaType): Spotlight | null {
  if (item.entry.state === "abandoned") return null;

  if (media === "tv") {
    const watched = item.progress?.watched ?? 0;
    // In progress with a newly-aired, unwatched episode → top priority.
    if (item.nextWatch && watched > 0) {
      return { kind: "ready", primary: "New episode", label: `Season ${item.nextWatch.season}, Episode ${item.nextWatch.number}` };
    }
    // Caught up (or a premiere on the way), waiting for the next drop.
    if (item.upcoming) {
      return { kind: "countdown", days: daysUntil(item.upcoming.date), label: item.upcoming.label };
    }
    // Not-started shows stay in Saved for later.
    return null;
  }

  // Movies live in "saved" — feature the ones you want to watch. Films with a
  // future release get a countdown; the rest are ready whenever you are.
  if (item.entry.state === "saved") {
    if (item.upcoming) return { kind: "countdown", days: daysUntil(item.upcoming.date), label: item.upcoming.label };
    return { kind: "ready", primary: "In your list", label: "Ready when you are" };
  }
  return null;
}

// Ready items first (most recent activity), then countdowns (soonest).
export function buildHero(items: LibraryItem[], media: MediaType): HeroEntry[] {
  const entries: HeroEntry[] = [];
  for (const item of items) {
    const spotlight = spotlightFor(item, media);
    if (spotlight) entries.push({ item, spotlight });
  }
  const ready = entries
    .filter((e) => e.spotlight.kind === "ready")
    .sort((a, b) => (a.item.entry.updated_at < b.item.entry.updated_at ? 1 : -1));
  const countdown = entries
    .filter((e): e is HeroEntry & { spotlight: { kind: "countdown"; days: number } } => e.spotlight.kind === "countdown")
    .sort((a, b) => a.spotlight.days - b.spotlight.days);
  return [...ready, ...countdown];
}
