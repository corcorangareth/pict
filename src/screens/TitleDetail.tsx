import { useEffect, useState } from "react";
import { ChevronLeft, Bell, BellOff, Check, Trash2, Star } from "lucide-react";
import { Art } from "@/components/Art";
import { SeasonAccordion } from "@/components/SeasonAccordion";
import { AudiencePicker } from "@/components/AudiencePicker";
import { api, type TitleDetailData } from "@/lib/api";
import { img } from "@shared/constants";
import type { Audience, Entry, EntryState } from "@/types";

// Title detail — full-bleed artwork header, overview, where to watch, progress,
// and the audience / notify / remove controls (PRD §7).
export function TitleDetail({
  titleId,
  entryId,
  onClose,
  onChanged,
}: {
  titleId: number;
  entryId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<TitleDetailData | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getTitle(titleId)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setEntry(d.entries.find((e) => e.id === entryId) ?? d.entries[0] ?? null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load"));
    return () => {
      alive = false;
    };
  }, [titleId, entryId]);

  if (error) {
    return (
      <Shell onClose={onClose}>
        <p style={{ padding: 20, color: "var(--brand)" }}>{error}</p>
      </Shell>
    );
  }
  if (!data || !entry) {
    return <Shell onClose={onClose}>{null}</Shell>;
  }

  const { title, seasons, releases } = data;
  const isTv = title.media_type === "tv";
  const filmWatched = entry.state === "completed";
  const providers = [...new Set(releases.map((r) => r.provider).filter(Boolean))] as string[];
  const where = providers.length ? providers : title.networks;
  const today = new Date().toISOString().slice(0, 10);
  const hasUnwatchedAired = seasons.some((s) =>
    s.episodes.some((e) => !e.watched_at && (!e.air_date || e.air_date <= today)),
  );

  async function applyEntry(patch: { state?: EntryState; audience?: Audience; notify?: boolean }) {
    if (!entry) return;
    setPending(true);
    setError(null);
    const prev = entry;
    setEntry({ ...entry, ...patch }); // optimistic
    try {
      const { entry: fresh } = await api.updateEntry(entry.id, patch);
      setEntry(fresh);
      onChanged();
    } catch (e) {
      setEntry(prev);
      setError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setPending(false);
    }
  }

  async function toggleEpisode(season: number, number: number, watched: boolean) {
    if (!data || !entry) return;
    setPending(true);
    // optimistic episode update
    setData({
      ...data,
      seasons: data.seasons.map((s) =>
        s.season !== season
          ? s
          : { ...s, episodes: s.episodes.map((e) => (e.number === number ? { ...e, watched_at: watched ? new Date().toISOString() : null } : e)) },
      ),
    });
    try {
      const res = await api.markProgress({ entryId: entry.id, titleId, season, episode: number, watched });
      setEntry({ ...entry, state: res.entryState });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      const fresh = await api.getTitle(titleId);
      setData(fresh);
    } finally {
      setPending(false);
    }
  }

  async function markSeason(season: number, watched: boolean) {
    if (!data || !entry) return;
    setPending(true);
    setData({
      ...data,
      seasons: data.seasons.map((s) =>
        s.season !== season ? s : { ...s, episodes: s.episodes.map((e) => ({ ...e, watched_at: watched ? new Date().toISOString() : null })) },
      ),
    });
    try {
      const res = await api.markProgress({ entryId: entry.id, titleId, season, all: true, watched });
      setEntry({ ...entry, state: res.entryState });
      onChanged();
    } catch {
      const fresh = await api.getTitle(titleId);
      setData(fresh);
    } finally {
      setPending(false);
    }
  }

  async function markUpToDate() {
    if (!data || !entry) return;
    const today = new Date().toISOString().slice(0, 10);
    setPending(true);
    // optimistic: tick every already-aired episode across all seasons
    setData({
      ...data,
      seasons: data.seasons.map((s) => ({
        ...s,
        episodes: s.episodes.map((e) =>
          (!e.air_date || e.air_date <= today) ? { ...e, watched_at: e.watched_at ?? new Date().toISOString() } : e,
        ),
      })),
    });
    try {
      const res = await api.markProgress({ entryId: entry.id, titleId, airedOnly: true, watched: true });
      setEntry({ ...entry, state: res.entryState });
      onChanged();
    } catch {
      const fresh = await api.getTitle(titleId);
      setData(fresh);
    } finally {
      setPending(false);
    }
  }

  async function markFilm() {
    if (!entry) return;
    setPending(true);
    try {
      const res = await api.markProgress({ entryId: entry.id, titleId, watched: !filmWatched });
      setEntry({ ...entry, state: res.entryState });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!entry) return;
    setPending(true);
    try {
      await api.deleteEntry(entry.id);
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
      setPending(false);
    }
  }

  const year = title.first_air?.slice(0, 4);
  const meta = [year, isTv ? "Series" : "Film", title.runtime ? `${title.runtime}m` : null].filter(Boolean).join(" · ");

  return (
    <Shell onClose={onClose}>
      {/* Full-bleed header */}
      <Art
        palette={title.art_palette}
        radius={0}
        imageSrc={img(title.backdrop_path, "backdrop") ?? img(title.poster_path, "hero")}
        imageAlt={title.name}
        eager
        style={{ aspectRatio: "3/2" }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,5,0.9) 2%, rgba(8,7,5,0.15) 44%, rgba(8,7,5,0.25) 100%)" }} />
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="press tap"
          style={{
            position: "absolute", top: 16, left: 16, width: 40, height: 40, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.16)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.24)",
          }}
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            {title.critic_score > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Star size={12} color="#fff" fill="#fff" />
                <span className="num" style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>
                  {title.critic_score}
                  {title.rt_score != null ? "% RT" : ""}
                </span>
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>{meta}</span>
          </div>
          <h1 style={{ fontSize: 38, lineHeight: 0.98, color: "#fff", letterSpacing: "-0.015em" }}>{title.name}</h1>
        </div>
      </Art>

      <div style={{ padding: "20px 20px 140px" }}>
        {title.overview && (
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", marginTop: 0 }}>{title.overview}</p>
        )}

        {where.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 8 }}>
              Where to watch
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {where.map((w) => (
                <span key={w} style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", background: "rgba(21,20,15,0.05)", borderRadius: 99, padding: "6px 12px" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginTop: 28 }}>
          {isTv ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 style={{ fontSize: 20 }}>Episodes</h3>
                {hasUnwatchedAired && (
                  <button
                    type="button"
                    onClick={markUpToDate}
                    disabled={pending}
                    className="press"
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--r-pill)",
                      background: "rgba(140,58,70,0.10)", color: "var(--brand)", fontSize: 12.5, fontWeight: 600,
                    }}
                  >
                    <Check size={13} strokeWidth={2.6} />
                    I'm up to date
                  </button>
                )}
              </div>
              <SeasonAccordion seasons={seasons} onToggleEpisode={toggleEpisode} onMarkSeason={markSeason} pending={pending} />
            </>
          ) : (
            <button
              type="button"
              onClick={markFilm}
              disabled={pending}
              className="press"
              style={{
                width: "100%", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: filmWatched ? "rgba(21,20,15,0.06)" : "var(--brand)",
                color: filmWatched ? "var(--ink-soft)" : "var(--paper)",
              }}
            >
              <Check size={16} strokeWidth={2.4} />
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>{filmWatched ? "Watched" : "Mark watched"}</span>
            </button>
          )}
        </div>

        {/* Controls */}
        <div style={{ marginTop: 28, borderTop: "1px solid var(--line)", paddingTop: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 10 }}>
            Watching with
          </p>
          <AudiencePicker value={entry.audience} onChange={(a) => applyEntry({ audience: a })} />

          <button
            type="button"
            onClick={() => applyEntry({ notify: !entry.notify })}
            disabled={pending}
            className="press"
            style={{
              marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderRadius: 16, background: "rgba(21,20,15,0.045)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {entry.notify ? <Bell size={16} color="var(--brand)" /> : <BellOff size={16} color="var(--ink-faint)" />}
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>Notify me on release</span>
            </span>
            <span
              aria-hidden
              style={{
                width: 42, height: 25, borderRadius: 99, padding: 3, background: entry.notify ? "var(--brand)" : "rgba(21,20,15,0.15)",
                display: "flex", justifyContent: entry.notify ? "flex-end" : "flex-start", transition: "background 200ms var(--ease)",
              }}
            >
              <span style={{ width: 19, height: 19, borderRadius: "50%", background: "#fff" }} />
            </span>
          </button>

          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="press"
            style={{ marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 16, color: "var(--ink-faint)" }}
          >
            <Trash2 size={15} />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>Remove from {entry.audience === "me" ? "my list" : "list"}</span>
          </button>

          {error && <p style={{ color: "var(--brand)", fontSize: 12.5, marginTop: 8, textAlign: "center" }}>{error}</p>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fade-in"
      role="dialog"
      aria-label="Title detail"
      style={{ position: "fixed", inset: 0, zIndex: 40, background: "var(--paper)", overflowY: "auto" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh" }}>{children}</div>
    </div>
  );
}
