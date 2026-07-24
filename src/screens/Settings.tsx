import { useMemo, useState } from "react";
import { Check, Bell, BellOff, Loader2 } from "lucide-react";
import { Slats } from "@/components/brand/Slats";
import { SavedCard } from "@/components/SavedCard";
import { EmptyState } from "@/components/EmptyState";
import { useLibrary } from "@/hooks/useLibrary";
import { usePush } from "@/hooks/usePush";
import { api, type LibraryItem } from "@/lib/api";
import { BUILD_ID } from "@/lib/pwa";
import type { MediaType } from "@/types";

// The "Me" tab: your watch history (completed titles that no longer surface on
// Home) plus app info. Respects the global Shows/Movies toggle.
export function Settings({ version, media, onOpen }: { version: number; media: MediaType; onOpen: (i: LibraryItem) => void }) {
  const { items } = useLibrary(version);
  const push = usePush();
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await api.testPush();
      setTestMsg(r.sent > 0 ? "Test sent — check your notifications." : "No devices subscribed.");
    } catch {
      setTestMsg("Couldn't send the test.");
    } finally {
      setTesting(false);
    }
  }

  const watched = useMemo(
    () =>
      (items ?? [])
        .filter((i) => i.entry.state === "completed" && i.title.media_type === media)
        .sort((a, b) => (a.entry.updated_at < b.entry.updated_at ? 1 : -1)),
    [items, media],
  );

  return (
    <div style={{ padding: "0 20px 140px" }}>
      <h1 style={{ fontSize: 34, marginBottom: 20 }}>You</h1>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 26, letterSpacing: "-0.01em" }}>Watched</h3>
        {watched.length > 0 && (
          <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-faint)" }}>
            {watched.length} {watched.length === 1 ? "title" : "titles"}
          </span>
        )}
      </div>

      {items === null ? (
        <div style={{ height: 120 }} aria-hidden />
      ) : watched.length === 0 ? (
        <EmptyState
          title={media === "tv" ? "No shows watched yet" : "No movies watched yet"}
          body={`${media === "tv" ? "Shows" : "Films"} you finish show up here.`}
          icon={<Check size={22} color="var(--ink-faint)" style={{ margin: "0 auto" }} />}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 24 }}>
          {watched.map((it) => (
            <SavedCard key={it.entry.id} item={it} onOpen={onOpen} />
          ))}
        </div>
      )}

      {/* Notifications */}
      <div style={{ marginTop: 40, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 12 }}>
          Notifications
        </p>
        <button
          type="button"
          onClick={push.toggle}
          disabled={!push.supported || push.busy || push.denied}
          className="press"
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderRadius: 16, background: "rgba(21,20,15,0.045)",
            opacity: push.supported && !push.denied ? 1 : 0.6,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {push.enabled ? <Bell size={17} color="var(--brand)" /> : <BellOff size={17} color="var(--ink-faint)" />}
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>Push notifications</span>
          </span>
          {push.busy ? (
            <Loader2 size={18} color="var(--ink-faint)" className="spin" />
          ) : (
            <span aria-hidden style={{ width: 42, height: 25, borderRadius: 99, padding: 3, background: push.enabled ? "var(--brand)" : "rgba(21,20,15,0.15)", display: "flex", justifyContent: push.enabled ? "flex-end" : "flex-start", transition: "background 200ms var(--ease)" }}>
              <span style={{ width: 19, height: 19, borderRadius: "50%", background: "#fff" }} />
            </span>
          )}
        </button>

        {push.enabled && (
          <button type="button" onClick={sendTest} disabled={testing} className="press" style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, color: "var(--brand)", display: "flex", alignItems: "center", gap: 6 }}>
            {testing && <Loader2 size={14} className="spin" />}
            Send a test notification
          </button>
        )}
        {testMsg && <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 8 }}>{testMsg}</p>}
        {push.denied && <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 8 }}>Blocked in your browser settings — re-allow notifications there to turn this on.</p>}
        {!push.supported && <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 8 }}>This browser doesn't support notifications.</p>}
      </div>

      {/* App info footer */}
      <div style={{ marginTop: 32, paddingTop: 22, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Slats size={26} color="var(--paper)" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Pict</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--ink-faint)" }}>Version {BUILD_ID}</p>
        </div>
      </div>
    </div>
  );
}
