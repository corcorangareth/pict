import { useMemo } from "react";
import { Check } from "lucide-react";
import { Slats } from "@/components/brand/Slats";
import { SavedCard } from "@/components/SavedCard";
import { EmptyState } from "@/components/EmptyState";
import { useLibrary } from "@/hooks/useLibrary";
import { BUILD_ID } from "@/lib/pwa";
import type { LibraryItem } from "@/lib/api";
import type { MediaType } from "@/types";

// The "Me" tab: your watch history (completed titles that no longer surface on
// Home) plus app info. Respects the global Shows/Movies toggle.
export function Settings({ version, media, onOpen }: { version: number; media: MediaType; onOpen: (i: LibraryItem) => void }) {
  const { items } = useLibrary(version);

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

      {/* App info footer */}
      <div style={{ marginTop: 40, paddingTop: 22, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
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
