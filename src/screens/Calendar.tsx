import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { api, type CalendarItem } from "@/lib/api";
import { img } from "@shared/constants";
import type { MediaType } from "@/types";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Month grid of upcoming episodes (Shows) or streaming dates (Movies) across all
// lists, plus an agenda below. Respects the global Shows/Movies toggle (PRD §7).
export function Calendar({ version, media, onOpen }: { version: number; media: MediaType; onOpen: (titleId: number) => void }) {
  const [cursor, setCursor] = useState(() => monthStart(new Date()));
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    setSelected(null);
    api
      .getCalendar(iso(monthStart(cursor)), iso(monthEnd(cursor)))
      .then(setItems)
      .catch(() => setItems([]));
  }, [cursor, version]);

  const shown = useMemo(
    () => (items ?? []).filter((i) => (media === "tv" ? i.type === "episode" : i.type === "release")),
    [items, media],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of shown) {
      const arr = m.get(it.date) ?? [];
      arr.push(it);
      m.set(it.date, arr);
    }
    return m;
  }, [shown]);

  const cells = useMemo(() => buildGrid(cursor), [cursor]);
  const today = iso(new Date());
  const agenda = selected ? shown.filter((i) => i.date === selected) : shown;

  return (
    <div style={{ padding: "0 20px 140px" }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 30 }}>{cursor.toLocaleDateString("en-IE", { month: "long", year: "numeric" })}</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <NavBtn label="Previous month" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeft size={18} color="var(--ink-soft)" /></NavBtn>
          <NavBtn label="Next month" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight size={18} color="var(--ink-soft)" /></NavBtn>
        </div>
      </div>

      {/* Weekday labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-faint)" }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const dayItems = byDay.get(cell) ?? [];
          const isToday = cell === today;
          const isSelected = cell === selected;
          const dayNum = Number(cell.slice(8, 10));
          return (
            <button
              key={i}
              type="button"
              onClick={() => dayItems.length && setSelected(isSelected ? null : cell)}
              className={dayItems.length ? "press" : undefined}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: 12,
                cursor: dayItems.length ? "pointer" : "default",
                background: isSelected ? "var(--brand)" : isToday ? "rgba(140,58,70,0.08)" : "transparent",
              }}
            >
              <span
                className="num"
                style={{
                  fontSize: 14,
                  fontWeight: isToday || isSelected ? 700 : 500,
                  color: isSelected ? "var(--paper)" : dayItems.length ? "var(--ink)" : "var(--ink-faint)",
                }}
              >
                {dayNum}
              </span>
              <span style={{ height: 5, display: "flex", alignItems: "center", gap: 2 }}>
                {dayItems.length > 0 && (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "var(--paper)" : "var(--brand)" }} />
                )}
                {dayItems.length > 1 && (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.6)" : "var(--brand-tint)" }} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Agenda */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 22 }}>{selected ? formatDay(selected) : "This month"}</h3>
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="press" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-faint)" }}>
              Show all
            </button>
          )}
        </div>

        {items === null ? (
          <div style={{ height: 80 }} aria-hidden />
        ) : agenda.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            body={media === "tv" ? "No episodes dated this month." : "No releases dated this month."}
            icon={<CalendarDays size={22} color="var(--ink-faint)" style={{ margin: "0 auto" }} />}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {agenda.map((it, i) => {
              const showDate = i === 0 || agenda[i - 1].date !== it.date;
              return (
                <div key={`${it.type}-${it.title_id}-${it.date}-${i}`}>
                  {showDate && !selected && (
                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "14px 0 6px" }}>
                      {formatDay(it.date)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpen(it.title_id)}
                    className="press"
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, textAlign: "left", opacity: it.watched ? 0.5 : 1 }}
                  >
                    <div style={{ width: 40, height: 56, borderRadius: 8, flexShrink: 0, overflow: "hidden", background: it.art_palette?.base ?? "rgba(21,20,15,0.06)" }}>
                      {img(it.poster_path, "poster") && <img src={img(it.poster_path, "poster")!} alt="" width={40} height={56} style={{ objectFit: "cover", width: "100%", height: "100%" }} loading="lazy" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{it.name}</p>
                      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: "2px 0 0" }}>{it.label}</p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="press tap" style={{ width: 40, height: 40, borderRadius: "var(--r-pill)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(21,20,15,0.05)", border: "1px solid var(--line)" }}>
      {children}
    </button>
  );
}

// ── date helpers (local) ────────────────────────────────────────────────────
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function buildGrid(cursor: Date): (string | null)[] {
  const start = monthStart(cursor);
  const lead = (start.getDay() + 6) % 7; // Monday-first
  const days = monthEnd(cursor).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= days; day++) cells.push(iso(new Date(cursor.getFullYear(), cursor.getMonth(), day)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function formatDay(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
}
