import { useRef, useState, createElement } from "react";
import { Bell } from "lucide-react";
import { Art } from "@/components/Art";
import { Countdown } from "@/components/Countdown";
import { owners } from "@/lib/audience";
import { daysUntil } from "@/lib/countdown";
import { img } from "@shared/constants";
import type { LibraryItem } from "@/lib/api";

// Coming Up carousel — soonest first, 4:5 artwork, countdown as editorial type,
// glass "Remind me" pill (PRD §7).
export function Hero({
  items,
  onFocus,
  onOpen,
}: {
  items: LibraryItem[];
  onFocus: (i: LibraryItem) => void;
  onOpen: (i: LibraryItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const card = el.scrollWidth / items.length;
    const i = Math.round(el.scrollLeft / card);
    if (i !== idx && items[i]) {
      setIdx(i);
      onFocus(items[i]);
    }
  };

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-bar"
        style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", padding: "0 20px 4px" }}
      >
        {items.map((it) => {
          const O = owners[it.entry.audience].icon;
          const days = it.upcoming ? daysUntil(it.upcoming.date) : 0;
          return (
            <article
              key={it.entry.id}
              className="press"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(it)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(it))}
              style={{ scrollSnapAlign: "start", flexShrink: 0, width: "84%", cursor: "pointer" }}
            >
              <Art
                palette={it.title.art_palette}
                radius={30}
                imageSrc={img(it.title.poster_path, "hero")}
                imageAlt={it.title.name}
                eager
                style={{ aspectRatio: "4/5", boxShadow: "0 22px 50px -20px rgba(21,20,15,0.55)" }}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,5,0.86) 4%, rgba(8,7,5,0.18) 46%, transparent 68%)" }} />

                <div style={{ position: "absolute", top: 24, left: 24 }}>
                  <Countdown days={days} />
                </div>

                <button
                  type="button"
                  className="press"
                  aria-label="Remind me"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute", top: 24, right: 20, display: "flex", alignItems: "center", gap: 6,
                    borderRadius: "var(--r-pill)", padding: "8px 12px 8px 10px",
                    background: "rgba(255,255,255,0.14)", backdropFilter: "blur(16px) saturate(160%)",
                    border: "1px solid rgba(255,255,255,0.22)",
                  }}
                >
                  <Bell size={13} color="#fff" strokeWidth={2.2} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Remind me</span>
                </button>

                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    {createElement(O, { size: 12, color: "rgba(255,255,255,0.72)", strokeWidth: 2.2 })}
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
                      {owners[it.entry.audience].label}
                      {it.upcoming?.where ? ` · ${it.upcoming.where}` : ""}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 42, lineHeight: 0.95, color: "#fff", letterSpacing: "-0.015em" }}>{it.title.name}</h2>
                  {it.upcoming && (
                    <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.72)", marginTop: 8 }}>{it.upcoming.label}</p>
                  )}
                </div>
              </Art>
            </article>
          );
        })}
        <div style={{ flexShrink: 0, width: 4 }} />
      </div>

      <div style={{ display: "flex", gap: 6, padding: "16px 20px 0" }}>
        {items.map((_, i) => (
          <div
            key={i}
            style={{ height: 3, borderRadius: 99, transition: "all 400ms var(--ease)", width: i === idx ? 22 : 7, background: i === idx ? "var(--brand)" : "rgba(21,20,15,0.16)" }}
          />
        ))}
      </div>
    </div>
  );
}
