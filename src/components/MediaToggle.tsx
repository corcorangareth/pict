import type { MediaType } from "@/types";

// Global Shows/Movies switch, centered in the header on every screen. A single
// segmented control with a sliding oxblood indicator — one tap flips the whole
// app between TV and film. Never shows both at once (by design).
const OPTIONS: { k: MediaType; label: string }[] = [
  { k: "tv", label: "Shows" },
  { k: "movie", label: "Movies" },
];

export function MediaToggle({ value, onChange }: { value: MediaType; onChange: (m: MediaType) => void }) {
  return (
    <div
      role="group"
      aria-label="Show TV or movies"
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        width: 152,
        padding: 4,
        borderRadius: "var(--r-pill)",
        background: "rgba(21,20,15,0.05)",
        border: "1px solid var(--line)",
        backdropFilter: "blur(10px)",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 4,
          width: "calc(50% - 4px)",
          borderRadius: "var(--r-pill)",
          background: "var(--brand)",
          transform: value === "movie" ? "translateX(100%)" : "none",
          transition: "transform 280ms var(--ease)",
        }}
      />
      {OPTIONS.map((o) => {
        const on = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.k)}
            className="press"
            style={{
              position: "relative",
              zIndex: 1,
              padding: "7px 0",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              color: on ? "var(--paper)" : "var(--ink-soft)",
              transition: "color 200ms var(--ease)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
