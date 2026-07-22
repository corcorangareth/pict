import { LayoutGrid, Sparkles, CalendarDays, User } from "lucide-react";
import type { Tab } from "@/types";

const tabs: { k: Tab; Icon: typeof LayoutGrid; label: string }[] = [
  { k: "home", Icon: LayoutGrid, label: "Home" },
  { k: "discover", Icon: Sparkles, label: "Discover" },
  { k: "cal", Icon: CalendarDays, label: "Calendar" },
  { k: "me", Icon: User, label: "Me" },
];

// Floating glass nav. Glass is allowed here (PRD §9: tab bar, Remind pill, play button).
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        bottom: 20,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: 6,
          borderRadius: "var(--r-pill)",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--line)",
          boxShadow: "0 12px 34px -10px rgba(21,20,15,0.24)",
        }}
      >
        {tabs.map(({ k, Icon, label }) => {
          const on = tab === k;
          return (
            <button
              key={k}
              type="button"
              aria-current={on ? "page" : undefined}
              aria-label={label}
              onClick={() => onChange(k)}
              className="press tap"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: "var(--r-pill)",
                padding: "10px 14px",
                background: on ? "var(--brand)" : "transparent",
                transition: "background var(--press-dur) var(--ease)",
              }}
            >
              <Icon
                size={16}
                color={on ? "var(--paper)" : "var(--ink-soft)"}
                strokeWidth={on ? 2.2 : 1.9}
              />
              {on && (
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--paper)",
                  }}
                >
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
