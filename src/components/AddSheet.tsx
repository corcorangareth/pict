import { useEffect, useRef, useState } from "react";
import { Search, X, Check, Loader2 } from "lucide-react";
import { AudiencePicker } from "@/components/AudiencePicker";
import { api, type SearchResult } from "@/lib/api";
import { img } from "@shared/constants";
import type { Audience } from "@/types";

// Search TMDB → pick a result → pick audience → add (PRD §7).
// Layout is keyboard-aware: the sheet fits inside the visual viewport, results
// scroll in the middle, and the Add button stays pinned + visible. Selecting a
// result dismisses the keyboard so the audience picker + button come into view.
export function AddSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (name: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [who, setWho] = useState<Audience>("me");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vh = useVisualViewportHeight();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults(await api.search(term));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function selectResult(r: SearchResult) {
    setSelected(r);
    inputRef.current?.blur(); // dismiss the keyboard so the footer is visible
  }

  async function add() {
    if (!selected) return;
    setAdding(true);
    setError(null);
    try {
      await api.addTitle({ tmdb_id: selected.tmdb_id, media_type: selected.media_type, audience: who });
      onAdded(selected.name);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
      setAdding(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        height: vh ?? "100dvh",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div className="fade-in" style={{ position: "absolute", inset: 0, background: "rgba(21,20,15,0.4)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-label="Add a title"
        className="sheet-up"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          maxHeight: "94%",
          display: "flex",
          flexDirection: "column",
          borderTopLeftRadius: "var(--r-sheet)",
          borderTopRightRadius: "var(--r-sheet)",
          background: "var(--paper)",
          boxShadow: "0 -20px 60px rgba(21,20,15,0.2)",
        }}
      >
        {/* Fixed head */}
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, margin: "0 auto 18px", background: "rgba(21,20,15,0.13)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 28 }}>Add a title</h3>
            <button type="button" aria-label="Close" onClick={onClose} className="press tap" style={{ width: 44, height: 44, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(21,20,15,0.06)" }}>
              <X size={16} color="var(--ink-soft)" />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, padding: "15px 16px", background: "rgba(21,20,15,0.05)" }}>
            {searching ? <Loader2 size={18} color="var(--ink-faint)" className="spin" /> : <Search size={18} color="var(--ink-faint)" />}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setSelected(null); }}
              placeholder="Search shows and films…"
              enterKeyHint="search"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16.5, color: "var(--ink)", fontFamily: "var(--font-ui)" }}
            />
          </div>
        </div>

        {/* Scrollable results */}
        <div className="no-bar" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 20px 4px" }}>
          {results.map((r) => {
            const on = selected?.tmdb_id === r.tmdb_id && selected?.media_type === r.media_type;
            const poster = img(r.poster_path, "poster");
            return (
              <button
                key={`${r.media_type}-${r.tmdb_id}`}
                type="button"
                aria-pressed={on}
                onClick={() => selectResult(r)}
                className="press"
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 8, borderRadius: 16, textAlign: "left", background: on ? "rgba(140,58,70,0.10)" : "transparent" }}
              >
                <div style={{ width: 52, height: 78, borderRadius: 10, flexShrink: 0, overflow: "hidden", background: "rgba(21,20,15,0.06)" }}>
                  {poster && <img src={poster} alt="" width={52} height={78} style={{ objectFit: "cover", width: "100%", height: "100%" }} loading="lazy" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "3px 0 0" }}>{r.year ?? "—"} · {r.media_type === "tv" ? "Series" : "Film"}</p>
                </div>
                {on && <Check size={18} color="var(--brand)" strokeWidth={2.6} />}
              </button>
            );
          })}
          {q.trim() && !searching && results.length === 0 && (
            <p style={{ fontSize: 14, color: "var(--ink-faint)", textAlign: "center", padding: "20px 0" }}>No matches for "{q.trim()}"</p>
          )}
        </div>

        {/* Pinned footer */}
        <div style={{ flexShrink: 0, padding: "12px 20px calc(20px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--line)", background: "var(--paper)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Watching with</p>
          <div style={{ marginBottom: 14 }}>
            <AudiencePicker value={who} onChange={setWho} />
          </div>
          {error && <p style={{ color: "var(--brand)", fontSize: 13, margin: "0 0 10px" }}>{error}</p>}
          <button
            type="button"
            onClick={add}
            disabled={!selected || adding}
            className="press"
            style={{ width: "100%", borderRadius: 16, padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: selected ? "var(--brand)" : "rgba(21,20,15,0.12)", opacity: adding ? 0.7 : 1 }}
          >
            {adding ? <Loader2 size={17} color="var(--paper)" className="spin" /> : <Check size={17} color="var(--paper)" strokeWidth={2.4} />}
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--paper)" }}>{selected ? `Add ${selected.name}` : "Pick a title"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Track the visual viewport height so the sheet sits above the on-screen keyboard.
function useVisualViewportHeight(): number | undefined {
  const [h, setH] = useState<number | undefined>(() => window.visualViewport?.height);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setH(vv.height);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return h;
}
