import { Slats } from "@/components/brand/Slats";
import { BUILD_ID } from "@/lib/pwa";

// The "Me" tab. Phase 7 adds the critic-score slider; Phase 5 the notification
// toggle. For now it carries the app version so it's obvious which build is live.
export function Settings() {
  return (
    <div style={{ padding: "0 20px 140px" }}>
      <h1 style={{ fontSize: 34, marginBottom: 24 }}>Settings</h1>

      <div style={{ padding: "20px 0", borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Slats size={26} color="var(--paper)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Pict</p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--ink-faint)" }}>Version {BUILD_ID}</p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.5 }}>
        Critic-score threshold, notifications, and install options will live here.
      </p>
    </div>
  );
}
