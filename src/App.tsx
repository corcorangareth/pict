import { useState, useRef } from "react";
import { Search, Plus } from "lucide-react";
import { Slats } from "@/components/brand/Slats";
import { TabBar } from "@/components/TabBar";
import { AddSheet } from "@/components/AddSheet";
import { Ambience } from "@/components/Ambience";
import { TitleDetail } from "@/screens/TitleDetail";
import { Home } from "@/screens/Home";
import { Discover } from "@/screens/Discover";
import { Calendar } from "@/screens/Calendar";
import { Settings } from "@/screens/Settings";
import type { Tab, Palette } from "@/types";
import "@/styles/global.css";

// A contextual greeting keeps the header editorial (PRD §7). Refined later.
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [addOpen, setAddOpen] = useState(false);
  const [mood, setMood] = useState<Palette | null>(null);
  const [detail, setDetail] = useState<{ titleId: number; entryId: number } | null>(null);
  // Bumped after a successful add/change so library-reading screens revalidate.
  const [libraryVersion, setLibraryVersion] = useState(0);
  const bumpLibrary = () => setLibraryVersion((v) => v + 1);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100dvh",
        overflow: "hidden",
        background: "var(--paper)",
      }}
    >
      <Ambience palette={mood} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header — only on non-Discover tabs in the mockup; kept global for the shell. */}
        <header
          className="rise"
          style={{
            padding: "28px 20px 20px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Slats size={17} title="Pict" />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                Pict
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              {greeting()}
            </p>
            <h1 style={{ fontSize: 36, lineHeight: 1.05, marginTop: 4 }}>
              Up next<span style={{ fontStyle: "italic" }}> for you</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              aria-label="Search"
              className="press tap"
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--r-pill)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(10px)",
                border: "1px solid var(--line)",
              }}
            >
              <Search size={16} color="var(--ink-soft)" />
            </button>
            <button
              type="button"
              aria-label="Add a title"
              onClick={() => setAddOpen(true)}
              className="press tap"
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--r-pill)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--brand)",
              }}
            >
              <Plus size={18} color="var(--paper)" strokeWidth={2.4} />
            </button>
          </div>
        </header>

        <main>
          {tab === "home" && (
            <Home
              version={libraryVersion}
              onMood={setMood}
              onOpen={(item) => setDetail({ titleId: item.title.id, entryId: item.entry.id })}
            />
          )}
          {tab === "discover" && <Discover />}
          {tab === "cal" && <Calendar />}
          {tab === "me" && <Settings />}
        </main>
      </div>

      <TabBar tab={tab} onChange={setTab} />

      {addOpen && (
        <AddSheet
          onClose={() => setAddOpen(false)}
          onAdded={(name) => { bumpLibrary(); showToast(`Added ${name} to your list`); }}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fade-in"
          style={{
            position: "fixed", bottom: 92, left: "50%", transform: "translateX(-50%)", zIndex: 60,
            maxWidth: 360, padding: "13px 20px", borderRadius: "var(--r-pill)",
            background: "var(--ink)", color: "var(--paper)", fontSize: 14, fontWeight: 500,
            boxShadow: "0 10px 30px -8px rgba(21,20,15,0.4)", textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}

      {detail && (
        <TitleDetail
          titleId={detail.titleId}
          entryId={detail.entryId}
          onClose={() => setDetail(null)}
          onChanged={bumpLibrary}
        />
      )}
    </div>
  );
}
