import { useState, useRef, useEffect } from "react";
import { Plus, ArrowUpCircle } from "lucide-react";
import { BUILD_ID, applyUpdate } from "@/lib/pwa";
import { Slats } from "@/components/brand/Slats";
import { TabBar } from "@/components/TabBar";
import { AddSheet } from "@/components/AddSheet";
import { MediaToggle } from "@/components/MediaToggle";
import { Ambience } from "@/components/Ambience";
import { TitleDetail } from "@/screens/TitleDetail";
import { Lock } from "@/screens/Lock";
import { Home } from "@/screens/Home";
import { Discover } from "@/screens/Discover";
import { Calendar } from "@/screens/Calendar";
import { Settings } from "@/screens/Settings";
import type { Tab, Palette, MediaType } from "@/types";
import { api, type LibraryItem } from "@/lib/api";
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
  // Global Shows/Movies mode, remembered across sessions.
  const [media, setMedia] = useState<MediaType>(() => (localStorage.getItem("pict-media") === "movie" ? "movie" : "tv"));
  const setMediaPersist = (m: MediaType) => {
    setMedia(m);
    localStorage.setItem("pict-media", m);
  };
  const [detail, setDetail] = useState<{ titleId: number; entryId?: number } | null>(null);

  // Route overlays (title detail, add sheet) through browser history so the
  // device/back gesture closes them instead of leaving the app. Opening pushes
  // a history entry; popstate (back) closes whatever's open; the in-app close
  // buttons call history.back() so the entry is balanced.
  const openDetail = (item: LibraryItem) => openTitle(item.title.id, item.entry.id);
  const openTitle = (titleId: number, entryId?: number) => {
    setDetail({ titleId, entryId });
    history.pushState({ pictOverlay: "detail" }, "");
  };
  const openAdd = () => {
    setAddOpen(true);
    history.pushState({ pictOverlay: "add" }, "");
  };
  const closeOverlay = () => history.back();
  useEffect(() => {
    const onPop = () => {
      setDetail(null);
      setAddOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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

  // Show an "Update available" banner when a new service worker is waiting.
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    const onNeed = () => setUpdateReady(true);
    window.addEventListener("pwa:need-refresh", onNeed);
    return () => window.removeEventListener("pwa:need-refresh", onNeed);
  }, []);

  // Confirm once, right after a new build takes effect.
  useEffect(() => {
    const last = localStorage.getItem("pict-build");
    if (last && last !== BUILD_ID) showToast("Updated to the latest version");
    localStorage.setItem("pict-build", BUILD_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Password gate: null = checking, false = locked, true = unlocked.
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    api.session().then(setAuthed);
    const onLocked = () => setAuthed(false);
    window.addEventListener("pict:locked", onLocked);
    return () => window.removeEventListener("pict:locked", onLocked);
  }, []);

  // While checking the session, render nothing (avoids a flash of the app or
  // the lock screen). Locked → the unlock gate. Unlocked → the app.
  if (authed === null) return <div style={{ minHeight: "100dvh", background: "var(--paper)" }} />;
  if (!authed) return <Lock onUnlock={() => setAuthed(true)} />;

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
        {/* Header — global top bar with the Shows/Movies toggle centered. */}
        <header className="rise" style={{ padding: "20px 20px 16px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Slats size={19} title="Pict" />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.025em", lineHeight: 1 }}>Pict</span>
            </div>
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              <MediaToggle value={media} onChange={setMediaPersist} />
            </div>
            <button
              type="button"
              aria-label="Add a title"
              onClick={openAdd}
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

          {tab === "home" && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                {greeting()}
              </p>
              <h1 style={{ fontSize: 36, lineHeight: 1.05, marginTop: 4 }}>
                Up next<span style={{ fontStyle: "italic" }}> for you</span>
              </h1>
            </div>
          )}
        </header>

        <main>
          {tab === "home" && (
            <Home
              version={libraryVersion}
              media={media}
              onMood={setMood}
              onOpen={openDetail}
              onOpenHistory={() => setTab("me")}
            />
          )}
          {tab === "discover" && <Discover />}
          {tab === "cal" && <Calendar version={libraryVersion} media={media} onOpen={openTitle} />}
          {tab === "me" && <Settings version={libraryVersion} media={media} onOpen={openDetail} />}
        </main>
      </div>

      <TabBar tab={tab} onChange={setTab} />

      {addOpen && (
        <AddSheet
          onClose={closeOverlay}
          onAdded={(name) => { bumpLibrary(); showToast(`Added ${name} to your list`); }}
        />
      )}

      {updateReady && (
        <button
          type="button"
          onClick={applyUpdate}
          className="fade-in press"
          style={{
            position: "fixed", top: "calc(12px + env(safe-area-inset-top))", left: "50%", transform: "translateX(-50%)", zIndex: 70,
            display: "flex", alignItems: "center", gap: 9, padding: "11px 18px", borderRadius: "var(--r-pill)",
            background: "var(--brand)", color: "var(--paper)", fontSize: 14, fontWeight: 600,
            boxShadow: "0 10px 30px -8px rgba(140,58,70,0.5)",
          }}
        >
          <ArrowUpCircle size={17} strokeWidth={2.2} />
          New version — tap to update
        </button>
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
          onClose={closeOverlay}
          onChanged={bumpLibrary}
        />
      )}
    </div>
  );
}
