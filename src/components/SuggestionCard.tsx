import { createElement } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import { Art } from "@/components/Art";
import { ScoreBadge } from "@/components/ScoreBadge";
import { owners } from "@/lib/audience";
import { img } from "@shared/constants";
import type { SuggestionItem } from "@/lib/api";

// Discover card — 3:4 poster, score badge over the artwork, reason underneath,
// audience-tagged Add pill. Shape mirrors SavedCard so the visual language
// stays consistent between the two grids (BUILD.md §9).
export function SuggestionCard({
  item,
  busy,
  added,
  onAdd,
}: {
  item: SuggestionItem;
  busy: boolean;
  added: boolean;
  onAdd: (item: SuggestionItem) => void;
}) {
  const O = owners[item.audience].icon;
  const kind = item.media_type === "tv" ? "Series" : "Film";
  const parts = [item.meta.year, kind].filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Art
        palette={null}
        radius={20}
        imageSrc={img(item.poster_path, "poster")}
        imageAlt={item.name}
        style={{ aspectRatio: "3/4", boxShadow: "0 10px 24px -14px rgba(21,20,15,0.45)" }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,5,0.55), transparent 55%)" }} />
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <ScoreBadge rtScore={item.rt_score} criticScore={item.critic_score} />
        </div>
        <div
          style={{
            position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.16)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.24)",
          }}
          aria-label={owners[item.audience].label}
        >
          {createElement(O, { size: 11, color: "#fff", strokeWidth: 2.2 })}
        </div>
      </Art>

      <p style={{ marginTop: 10, fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{item.name}</p>
      {parts.length > 0 && (
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 2 }}>{parts.join(" · ")}</p>
      )}
      <p
        style={{
          marginTop: 8,
          fontSize: 13,
          lineHeight: 1.35,
          color: "var(--ink-soft)",
          fontStyle: "italic",
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.005em",
        }}
      >
        {item.reason}
      </p>

      <button
        type="button"
        disabled={busy || added}
        onClick={() => onAdd(item)}
        className="press tap"
        style={{
          marginTop: 12,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 999,
          background: added ? "rgba(21,20,15,0.06)" : "var(--brand)",
          color: added ? "var(--ink-soft)" : "var(--paper)",
          fontSize: 13,
          fontWeight: 600,
          opacity: busy ? 0.7 : 1,
          transition: "background 200ms var(--ease)",
        }}
      >
        {added ? <Check size={14} strokeWidth={2.4} /> : busy ? <SpinIcon /> : <Plus size={14} strokeWidth={2.4} />}
        {added ? "Added" : busy ? "Adding" : `Add to ${owners[item.audience].label}`}
      </button>
    </div>
  );
}

function SpinIcon() {
  return (
    <span style={{ display: "inline-flex", animation: "pict-spin 900ms linear infinite" }}>
      <Loader2 size={14} strokeWidth={2.4} />
      <style>{`@keyframes pict-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}
