import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Season } from "@/lib/api";

// TV progress: seasons → episodes, tap an episode to mark watched, plus a
// "mark season watched" shortcut (PRD §7). Unaired episodes are dimmed.
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
  // Open the first season with an unwatched episode by default.
  const initial = seasons.find((s) => s.episodes.some((e) => !e.watched_at))?.season ?? seasons[0]?.season;
  const [open, setOpen] = useState<number | null>(initial ?? null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {seasons.map((s) => {
        const isOpen = open === s.season;
        const watchedCount = s.episodes.filter((e) => e.watched_at).length;
        const allWatched = watchedCount === s.episodes.length && s.episodes.length > 0;
        return (
          <div key={s.season} style={{ border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.5)" }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.season)}
              aria-expanded={isOpen}
              className="press"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", textAlign: "left" }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Season {s.season}</p>
                <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                  {watchedCount}/{s.episodes.length} watched
                </p>
              </div>
              <ChevronDown
                size={18}
                color="var(--ink-faint)"
                style={{ transition: "transform 250ms var(--ease)", transform: isOpen ? "rotate(180deg)" : "none" }}
              />
            </button>

            {isOpen && (
              <div style={{ padding: "0 8px 8px" }}>
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
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                        borderRadius: 12, textAlign: "left", opacity: aired ? 1 : 0.55,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: watched ? "var(--brand)" : "transparent",
                          border: watched ? "none" : "1.5px solid var(--line)",
                        }}
                      >
                        {watched && <Check size={13} color="var(--paper)" strokeWidth={2.6} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", display: "block" }}>
                          {e.number}. {e.name ?? `Episode ${e.number}`}
                        </span>
                        {e.air_date && (
                          <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                            {aired ? formatDate(e.air_date) : `Airs ${formatDate(e.air_date)}`}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onMarkSeason(s.season, !allWatched)}
                  className="press"
                  style={{ margin: "6px 12px 8px", fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}
                >
                  {allWatched ? "Mark season unwatched" : "Mark season watched"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}
