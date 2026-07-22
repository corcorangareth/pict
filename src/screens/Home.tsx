import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Hero } from "@/components/Hero";
import { ContinueCard } from "@/components/ContinueCard";
import { SavedCard } from "@/components/SavedCard";
import { Heading } from "@/components/Heading";
import { AudienceFilter, type AudienceFilterValue } from "@/components/AudienceFilter";
import { useLibrary } from "@/hooks/useLibrary";
import { daysUntil } from "@/lib/countdown";
import type { LibraryItem } from "@/lib/api";
import type { Palette } from "@/types";

export function Home({
  version,
  onMood,
  onOpen,
  onOpenHistory,
}: {
  version: number;
  onMood: (p: Palette | null) => void;
  onOpen: (item: LibraryItem) => void;
  onOpenHistory: () => void;
}) {
  const { items, error } = useLibrary(version);
  const [audience, setAudience] = useState<AudienceFilterValue>("all");

  const filtered = useMemo(
    () => (items ?? []).filter((i) => audience === "all" || i.entry.audience === audience),
    [items, audience],
  );

  // Coming Up = anything with a genuinely upcoming episode/release you're still
  // waiting on. Includes a *completed* TV show whose next season is coming (you're
  // caught up and waiting for more). Excludes abandoned titles, and completed
  // films (you've watched it — a future streaming date is just noise).
  const comingUp = useMemo(
    () =>
      filtered
        .filter(
          (i) =>
            i.upcoming &&
            i.entry.state !== "abandoned" &&
            !(i.entry.state === "completed" && i.title.media_type === "movie"),
        )
        .sort((a, b) => daysUntil(a.upcoming!.date) - daysUntil(b.upcoming!.date)),
    [filtered],
  );
  const keepGoing = useMemo(() => filtered.filter((i) => i.entry.state === "watching"), [filtered]);
  const saved = useMemo(() => filtered.filter((i) => i.entry.state === "saved"), [filtered]);

  // Focused palette drives the ambient wash. Re-focus when the filter changes.
  useEffect(() => {
    const focus: LibraryItem | undefined = comingUp[0] ?? keepGoing[0] ?? saved[0] ?? filtered[0];
    onMood(focus?.title.art_palette ?? null);
  }, [comingUp, keepGoing, saved, filtered, onMood]);

  const total = filtered.length;

  return (
    <div style={{ paddingBottom: 140 }}>
      <AudienceFilter value={audience} onChange={setAudience} />

      {items === null && !error && <div style={{ height: 200 }} aria-hidden />}

      {items !== null && total === 0 && (
        <EmptyState
          title="Nothing here yet"
          body="Tap + to add a show or film."
          icon={<Sparkles size={22} color="var(--ink-faint)" style={{ margin: "0 auto" }} />}
        />
      )}

      {comingUp.length > 0 && (
        <div className="rise" style={{ animationDelay: "0.1s" }}>
          <Hero items={comingUp} onFocus={(i) => onMood(i.title.art_palette)} onOpen={onOpen} />
        </div>
      )}

      {keepGoing.length > 0 && (
        <section className="rise" style={{ marginTop: 44, animationDelay: "0.16s" }}>
          <Heading
            action={
              <button type="button" onClick={onOpenHistory} className="press" style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-faint)" }}>
                History
              </button>
            }
          >
            Keep going
          </Heading>
          <div className="no-bar" style={{ display: "flex", gap: 14, padding: "0 20px", overflowX: "auto", scrollSnapType: "x proximity" }}>
            {keepGoing.map((it) => (
              <div key={it.entry.id} style={{ scrollSnapAlign: "start" }}>
                <ContinueCard item={it} onOpen={onOpen} />
              </div>
            ))}
            <div style={{ flexShrink: 0, width: 4 }} />
          </div>
        </section>
      )}

      {saved.length > 0 && (
        <section className="rise" style={{ marginTop: 44, padding: "0 20px", animationDelay: "0.22s" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 26, letterSpacing: "-0.01em" }}>Saved for later</h3>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-faint)" }}>
              {saved.length} {saved.length === 1 ? "title" : "titles"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 24 }}>
            {saved.map((it) => (
              <SavedCard key={it.entry.id} item={it} onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
