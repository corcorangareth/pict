import { Bell } from "lucide-react";

// In-app pre-permission card, shown the first time a title is added (PRD §5).
// Never triggers the browser prompt until the user opts in here.
export function SoftPushPrompt({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="fade-in" style={{ position: "absolute", inset: 0, background: "rgba(21,20,15,0.4)", backdropFilter: "blur(3px)" }} onClick={onDismiss} />
      <div
        role="dialog"
        aria-label="Turn on notifications"
        className="sheet-up"
        style={{ position: "relative", width: "100%", maxWidth: 360, background: "var(--paper)", borderRadius: "var(--r-sheet)", padding: 28, textAlign: "center", boxShadow: "0 20px 60px rgba(21,20,15,0.25)" }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Bell size={26} color="var(--paper)" strokeWidth={2} />
        </div>
        <h3 style={{ fontSize: 26, letterSpacing: "-0.01em" }}>
          Never miss a<span style={{ fontStyle: "italic" }}> drop</span>
        </h3>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 8 }}>
          Pict can nudge you the moment a new episode airs or a film lands on streaming. Nothing else — no noise.
        </p>
        <button type="button" onClick={onEnable} className="press" style={{ width: "100%", marginTop: 20, padding: 15, borderRadius: 16, background: "var(--brand)", color: "var(--paper)", fontSize: 15.5, fontWeight: 600 }}>
          Turn on notifications
        </button>
        <button type="button" onClick={onDismiss} className="press" style={{ width: "100%", marginTop: 8, padding: 12, fontSize: 14, fontWeight: 500, color: "var(--ink-faint)" }}>
          Not now
        </button>
      </div>
    </div>
  );
}
