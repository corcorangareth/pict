import { Play } from "lucide-react";
import { Art } from "@/components/Art";
import { owners } from "@/lib/audience";
import type { LibraryItem } from "@/lib/api";

// Keep Going rail card — 16:10 art, progress line, next-episode label (PRD §7).
export function ContinueCard({ item }: { item: LibraryItem }) {
  const p = item.title.art_palette;
  const pct = item.progress && item.progress.total > 0
    ? Math.round((item.progress.watched / item.progress.total) * 100)
    : 0;

  const sub = item.progress
    ? `${item.progress.watched}/${item.progress.total} watched`
    : "";
  const next = item.nextWatch
    ? `Episode ${item.nextWatch.number}`
    : "Up to date";

  return (
    <div className="press" style={{ flexShrink: 0, width: 250 }}>
      <Art palette={p} radius={22} style={{ aspectRatio: "16/10", boxShadow: "0 14px 30px -16px rgba(21,20,15,0.5)" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,5,0.6), transparent 60%)" }} />
        <button
          type="button"
          aria-label="Resume"
          className="press"
          style={{
            position: "absolute", inset: 0, margin: "auto", width: 48, height: 48, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(14px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <Play size={16} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 2 }} />
        </button>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 14px 12px" }}>
          <div style={{ height: 3, borderRadius: 99, overflow: "hidden", marginBottom: 8, background: "rgba(255,255,255,0.22)" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: "#fff" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff" }}>{next}</span>
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{sub}</span>
          </div>
        </div>
      </Art>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: p?.tint ?? "var(--brand-tint)" }} />
        <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>{item.title.name}</p>
        <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>· {owners[item.entry.audience].short}</span>
      </div>
    </div>
  );
}
