import { useEffect, useRef, useState } from "react";
import { Search, X, Check, Loader2 } from "lucide-react";
import { AudiencePicker } from "@/components/AudiencePicker";
import { api, type SearchResult } from "@/lib/api";
import { img } from "@shared/constants";
import type { Audience } from "@/types";

// Search TMDB → pick a result → pick audience → add (PRD §7 add sheet).
export function AddSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [who, setWho] = useState<Audience>("me");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search.
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

  async function add() {
    if (!selected) return;
    setAdding(true);
    setError(null);
    try {
      await api.addTitle({ tmdb_id: selected.tmdb_id, media_type: selected.media_type, audience: who });
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
      setAdding(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div
        className="fade-in"
        style={{ position: "absolute", inset: 0, background: "rgba(21,20,15,0.4)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Add a title"
        className="sheet-up"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          borderTopLeftRadius: "var(--r-sheet)",
          borderTopRightRadius: "var(--r-sheet)",
          padding: "12px 20px 32px",
          background: "var(--paper)",
          boxShadow: "0 -20px 60px rgba(21,20,15,0.2)",
          maxHeight: "88dvh",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, margin: "0 auto 20px", background: "rgba(21,20,15,0.13)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 27 }}>Add a title</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="press tap"
            style={{ width: 44, height: 44, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(21,20,15,0.06)" }}>
            <X size={15} color="var(--ink-soft)" />
          </button>
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, padding: "14px 16px", marginBottom: 16, background: "rgba(21,20,15,0.045)" }}>
          {searching ? (
            <Loader2 size={16} color="var(--ink-faint)" className="spin" />
          ) : (
            <Search size={16} color="var(--ink-faint)" />
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelected(null); }}
            placeholder="Search shows and films…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "var(--ink)", fontFamily: "var(--font-ui)" }}
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
            {results.map((r) => {
              const on = selected?.tmdb_id === r.tmdb_id && selected?.media_type === r.media_type;
              const poster = img(r.poster_path, "poster");
              return (
                <button
                  key={`${r.media_type}-${r.tmdb_id}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(r)}
                  className="press"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, textAlign: "left", background: on ? "rgba(140,58,70,0.10)" : "transparent" }}
                >
                  <div style={{ width: 42, height: 56, borderRadius: 8, flexShrink: 0, overflow: "hidden", background: "rgba(21,20,15,0.06)" }}>
                    {poster && <img src={poster} alt="" width={42} height={56} style={{ objectFit: "cover", width: "100%", height: "100%" }} loading="lazy" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{r.name}</p>
                    <p style={{ fontSize: 11.5, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                      {r.year ?? "—"} · {r.media_type === "tv" ? "Series" : "Film"}
                    </p>
                  </div>
                  {on && <Check size={16} color="var(--brand)" strokeWidth={2.6} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Audience */}
        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
          Watching with
        </p>
        <div style={{ marginBottom: 20 }}>
          <AudiencePicker value={who} onChange={setWho} />
        </div>

        {error && <p style={{ color: "var(--brand)", fontSize: 12.5, margin: "0 0 12px" }}>{error}</p>}

        <button
          type="button"
          onClick={add}
          disabled={!selected || adding}
          className="press"
          style={{
            width: "100%",
            borderRadius: 16,
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: selected ? "var(--brand)" : "rgba(21,20,15,0.12)",
            opacity: adding ? 0.7 : 1,
          }}
        >
          {adding ? <Loader2 size={16} color="var(--paper)" className="spin" /> : <Check size={16} color="var(--paper)" strokeWidth={2.4} />}
          <span style={{ fontSize: 15.5, fontWeight: 600, color: "var(--paper)" }}>
            {selected ? `Add ${selected.name}` : "Pick a title"}
          </span>
        </button>
      </div>
    </div>
  );
}
