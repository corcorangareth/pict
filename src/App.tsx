import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Slats } from "@/components/brand/Slats";
import { TabBar } from "@/components/TabBar";
import { Home } from "@/screens/Home";
import { Discover } from "@/screens/Discover";
import { Calendar } from "@/screens/Calendar";
import { Settings } from "@/screens/Settings";
import type { Tab } from "@/types";
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
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              {greeting()}
            </p>
            <h1 style={{ fontSize: 34, lineHeight: 1.05, marginTop: 2 }}>
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
          {tab === "home" && <Home />}
          {tab === "discover" && <Discover />}
          {tab === "cal" && <Calendar />}
          {tab === "me" && <Settings />}
        </main>
      </div>

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
