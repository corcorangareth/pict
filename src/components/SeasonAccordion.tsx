import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Season } from "@/lib/api";

// TV progress: seasons → episodes. The season header has a one-tap checkbox to
// mark the whole season without expanding; expanding lets you tick individual
// episodes (PRD §7). Unaired episodes are dimmed.
export function SeasonAccordion({
  seasons,
  onToggleEpisode,
  onMarkSeason,
  pending,
}: {
  seasons: Season[];
  onToggleEpisode: (season: number, number: number, watched: boolean) => void;
  onMarkSeason: (season: number, watched: boolean) => void;
  pending: boolean;
}) {
  const initial = seasons.find((s) => s.episodes.some((e) => !e.watched_at))?.season ?? seasons[0]?.season;
  const [open, setOpen] = useState<number | null>(initial ?? null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {seasons.map((s) => {
        const isOpen = open === s.season;
        const watchedCount = s.episodes.filter((e) => e.watched_at).length;
        const total = s.episodes.length;
        const allWatched = watchedCount === total && total > 0;
        const someWatched = watchedCount > 0 && !allWatched;

        return (
          <div key={s.season} style={{ border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                type="button"
                disabled={pending}
                aria-label={allWatched ? `Mark season ${s.season} unwatched` : `Mark season ${s.season} watched`}
                aria-pressed={allWatched}
                onClick={() => onMarkSeason(s.season, !allWatched)}
                className="press tap"
                style={{ padding: "16px 4px 16px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <SeasonTick all={allWatched} some={someWatched} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.season)}
                aria-expanded={isOpen}
                className="press"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 16px 12px", textAlign: "left" }}
              >
                <div>
                  <p style={{ fontSize: 16.5, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Season {s.season}</p>
                  <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "3px 0 0" }}>{watchedCount}/{total} watched</p>
                </div>
                <ChevronDown
                  size={18}
                  color="var(--ink-faint)"
                  style={{ transition: "transform 250ms var(--ease)", transform: isOpen ? "rotate(180deg)" : "none" }}
                />
              </button>
            </div>

            {isOpen && (
              <div style={{ padding: "0 8px 10px" }}>
                {s.episodes.map((e) => {
                  const watched = !!e.watched_at;
                  const aired = !e.air_date || e.air_date <= today;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      disabled={pending}
                      onClick={() => onToggleEpisode(s.season, e.number, !watched)}
                      className="press"
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, textAlign: "left", opacity: aired ? 1 : 0.55 }}
                    >
                      <Tick on={watched} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", display: "block" }}>
                          {e.number}. {e.name ?? `Episode ${e.number}`}
                        </span>
                        {e.air_date && (
                          <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>
                            {aired ? formatDate(e.air_date) : `Airs ${formatDate(e.air_date)}`}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Episode tick — filled when watched.
function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: on ? "var(--brand)" : "transparent",
        border: on ? "none" : "1.5px solid var(--line)",
      }}
    >
      {on && <Check size={13} color="var(--paper)" strokeWidth={2.6} />}
    </span>
  );
}

// Season tick — filled (all), oxblood dot (some), empty (none).
function SeasonTick({ all, some }: { all: boolean; some: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: all ? "var(--brand)" : "transparent",
        border: all ? "none" : `1.5px solid ${some ? "var(--brand)" : "var(--line)"}`,
      }}
    >
      {all ? (
        <Check size={14} color="var(--paper)" strokeWidth={2.6} />
      ) : some ? (
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--brand)" }} />
      ) : null}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}
