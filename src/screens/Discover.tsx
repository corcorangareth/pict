import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Heading } from "@/components/Heading";
import { SuggestionCard } from "@/components/SuggestionCard";
import { api, type AppSettings, type SuggestionItem } from "@/lib/api";
import { CRITIC_MIN, CRITIC_MAX } from "@shared/constants";
import type { MediaType } from "@/types";

export function Discover({
  media,
  onLibraryChanged,
}: {
  media: MediaType;
  onLibraryChanged: () => void;
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyRefresh, setBusyRefresh] = useState(false);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});

  // Initial load: cached suggestions + settings, in parallel.
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getSuggestions(), api.getSettings()])
      .then(([s, cfg]) => {
        if (cancelled) return;
        setSuggestions(s.suggestions);
        setGeneratedAt(s.generated_at);
        setSettings(cfg);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (suggestions ?? []).filter((s) => s.media_type === media),
    [suggestions, media],
  );

  // Live threshold pulls from the client cache when the user drags the slider.
  // We debounce the PATCH separately so the visual response is instant.
  const [threshold, setThreshold] = useState<number | null>(null);
  useEffect(() => {
    if (settings) setThreshold((cur) => cur ?? settings.critic_threshold);
  }, [settings]);

  useEffect(() => {
    if (threshold == null || settings == null || threshold === settings.critic_threshold) return;
    const t = window.setTimeout(() => {
      api.patchSettings({ critic_threshold: threshold }).then(setSettings).catch(() => {});
    }, 350);
    return () => window.clearTimeout(t);
  }, [threshold, settings]);

  const effectiveThreshold = threshold ?? settings?.critic_threshold ?? 75;
  const belowGate = filtered.filter((s) => s.critic_score < effectiveThreshold).length;
  const abovegate = filtered.filter((s) => s.critic_score >= effectiveThreshold);

  const refresh = useCallback(async () => {
    setBusyRefresh(true);
    setError(null);
    try {
      const s = await api.refreshSuggestions();
      setSuggestions(s.suggestions);
      setGeneratedAt(s.generated_at);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusyRefresh(false);
    }
  }, []);

  const onAdd = useCallback(
    async (item: SuggestionItem) => {
      const key = `${item.media_type}:${item.tmdb_id}`;
      setAdding((prev) => ({ ...prev, [key]: true }));
      try {
        await api.addTitle({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          audience: item.audience,
          state: "saved",
        });
        setAdded((prev) => ({ ...prev, [key]: true }));
        onLibraryChanged();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add");
      } finally {
        setAdding((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [onLibraryChanged],
  );

  return (
    <div style={{ paddingBottom: 140 }}>
      {/* Threshold slider — the Discover gate (BUILD.md §7, §5). */}
      <section className="rise" style={{ padding: "4px 20px 4px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
            Critic score floor
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 34,
              lineHeight: 1,
              letterSpacing: "var(--tracking-num)",
              fontVariantNumeric: "tabular-nums",
              color: "var(--ink)",
            }}
          >
            {effectiveThreshold}
          </span>
        </div>
        <input
          type="range"
          min={CRITIC_MIN}
          max={CRITIC_MAX}
          step={1}
          value={effectiveThreshold}
          onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
          aria-label="Critic score floor"
          style={{
            width: "100%",
            accentColor: "var(--brand)",
          }}
        />
        <p style={{ marginTop: 6, fontSize: 12.5, color: "var(--ink-faint)" }}>
          Only titles scoring {effectiveThreshold} or higher.
          {belowGate > 0 && ` ${belowGate} below the gate.`}
        </p>
      </section>

      <Heading
        action={
          <button
            type="button"
            onClick={refresh}
            disabled={busyRefresh}
            className="press"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 500,
              color: busyRefresh ? "var(--ink-faint)" : "var(--brand)",
              opacity: busyRefresh ? 0.6 : 1,
            }}
            aria-label="Regenerate suggestions"
          >
            <span
              style={{
                display: "inline-flex",
                animation: busyRefresh ? "pict-spin 900ms linear infinite" : undefined,
              }}
            >
              <RefreshCw size={14} strokeWidth={2.2} />
            </span>
            {busyRefresh ? "Thinking" : "Refresh"}
          </button>
        }
      >
        For you
      </Heading>

      {generatedAt && (
        <p style={{ padding: "0 20px", marginTop: -8, marginBottom: 16, fontSize: 12, color: "var(--ink-faint)" }}>
          Updated {relativeTime(generatedAt)}
        </p>
      )}

      {error && (
        <p style={{ padding: "0 20px", color: "var(--brand)", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {suggestions === null && !error && <div style={{ height: 320 }} aria-hidden />}

      {suggestions !== null && suggestions.length === 0 && (
        <EmptyState
          title="Suggestions arrive after your first finish"
          body="Once you finish a few titles, tap Refresh here for personal picks."
          icon={<Sparkles size={22} color="var(--ink-faint)" style={{ margin: "0 auto" }} />}
        />
      )}

      {suggestions !== null && suggestions.length > 0 && abovegate.length === 0 && (
        <EmptyState
          title="Nothing clears the gate"
          body={belowGate > 0 ? "Lower the score floor or tap Refresh for a fresh batch." : "Tap Refresh for new picks."}
          icon={<Sparkles size={22} color="var(--ink-faint)" style={{ margin: "0 auto" }} />}
        />
      )}

      {abovegate.length > 0 && (
        <section className="rise" style={{ padding: "0 20px", animationDelay: "0.08s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 28 }}>
            {abovegate.map((s) => {
              const key = `${s.media_type}:${s.tmdb_id}`;
              return (
                <SuggestionCard
                  key={key}
                  item={s}
                  busy={!!adding[key]}
                  added={!!added[key]}
                  onAdd={onAdd}
                />
              );
            })}
          </div>
        </section>
      )}

      <style>{`@keyframes pict-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "just now";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86_400) return `${Math.round(sec / 3600)}h ago`;
  const d = Math.round(sec / 86_400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
