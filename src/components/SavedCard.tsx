import { createElement } from "react";
import { Art } from "@/components/Art";
import { owners } from "@/lib/audience";
import { img } from "@shared/constants";
import type { LibraryItem } from "@/lib/api";

// Saved for later — 3:4 poster with an audience badge (PRD §7).
export function SavedCard({ item, onOpen }: { item: LibraryItem; onOpen: (i: LibraryItem) => void }) {
  const O = owners[item.entry.audience].icon;
  const kind = item.title.media_type === "tv" ? "Series" : "Film";
  const meta = [item.where, kind].filter(Boolean).join(" · ");

  return (
    <div
      className="press"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(item))}
      style={{ cursor: "pointer" }}
    >
      <Art
        palette={item.title.art_palette}
        radius={20}
        imageSrc={img(item.title.poster_path, "poster")}
        imageAlt={item.title.name}
        style={{ aspectRatio: "3/4", boxShadow: "0 10px 24px -14px rgba(21,20,15,0.45)" }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,5,0.5), transparent 55%)" }} />
        <div
          style={{
            position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.16)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.24)",
          }}
        >
          {createElement(O, { size: 11, color: "#fff", strokeWidth: 2.2 })}
        </div>
      </Art>
      <p style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{item.title.name}</p>
      <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 1 }}>{meta}</p>
    </div>
  );
}
