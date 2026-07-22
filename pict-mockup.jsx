import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Plus, Bell, Play, Check, X, Users, User, Sparkles, LayoutGrid, CalendarDays, Bookmark, RefreshCw } from "lucide-react";

/* ────────────────────────────────────────────────────────────
   PICT — artwork-driven watchlist
   Light, ambient, editorial. Art colours bleed into the room.
   ──────────────────────────────────────────────────────────── */

const paper = "#FBFAF8";
const ink = "#15140F";
const inkSoft = "#57544B";
const inkFaint = "#9C978B";
const line = "rgba(21,20,15,0.07)";
const brand = "#8C3A46";      // Oxblood — brand, primary action
const brandTint = "#D19AA3";  // hover, subtle fills

const display = "'Instrument Serif', Georgia, serif";
const ui = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* Each title carries its own palette — the app takes its mood from the art */
const art = {
  cliffhold:  { base: "#0A2530", a: "#4FD1C5", b: "#0E5E7A", c: "#BCF3EA", tint: "#7FD8D0" },
  ember:      { base: "#2B0F08", a: "#FF8A4C", b: "#C2321F", c: "#FFD9A8", tint: "#F0A07A" },
  kingdoms:   { base: "#231206", a: "#F0B24A", b: "#8A4B12", c: "#FFE9BC", tint: "#E8BE7E" },
  moons:      { base: "#1A1030", a: "#9D7BF0", b: "#3B2478", c: "#DCCDFF", tint: "#B8A3F2" },
  ward:       { base: "#101A22", a: "#8FB4CC", b: "#2A4356", c: "#D9E8F0", tint: "#A9C4D6" },
  fintan:     { base: "#0E2418", a: "#63C98E", b: "#14563A", c: "#CFF0DC", tint: "#8FCFA9" },
  harbour:    { base: "#231B08", a: "#E8CE5E", b: "#7A5E14", c: "#FBF0C0", tint: "#DCC97F" },
  nightglass: { base: "#22101B", a: "#E578A6", b: "#7A1F49", c: "#FFD3E4", tint: "#DFA0BC" },
};

const owners = {
  me:     { label: "Me",     short: "Me",     icon: User },
  us:     { label: "Us Two", short: "Us",     icon: Users },
  family: { label: "Family", short: "Family", icon: Users },
};

const upcoming = [
  { id: 7,  title: "Cliffhold",       art: "cliffhold", type: "tv",    owner: "us",     days: 2,  note: "Season 3 premiere", where: "Apple TV+" },
  { id: 8,  title: "Under Two Moons", art: "moons",     type: "movie", owner: "family", days: 6,  note: "In cinemas",        where: "Cinema" },
  { id: 9,  title: "Small Kingdoms",  art: "kingdoms",  type: "tv",    owner: "family", days: 11, note: "Episode 7",         where: "Netflix" },
  { id: 10, title: "The Quiet Ward",  art: "ward",      type: "tv",    owner: "me",     days: 19, note: "Season 1 premiere", where: "Sky" },
];

const watching = [
  { id: 1, title: "Cliffhold",      art: "cliffhold", owner: "us",     sub: "S2 · E4",  next: "Episode 5", pct: 50, where: "Apple TV+" },
  { id: 2, title: "The Long Ember", art: "ember",     owner: "me",     sub: "1h 12m left", next: "Resume", pct: 62, where: "Cinema" },
  { id: 3, title: "Small Kingdoms", art: "kingdoms",  owner: "family", sub: "S1 · E6",  next: "Episode 7", pct: 60, where: "Netflix" },
];

const saved = [
  { id: 4, title: "Fintan's Table",  art: "fintan",     owner: "us",     meta: "RTÉ · Series" },
  { id: 5, title: "Harbour Lights",  art: "harbour",    owner: "family", meta: "Disney+ · Film" },
  { id: 6, title: "Nightglass",      art: "nightglass", owner: "me",     meta: "Cinema · Film" },
  { id: 11, title: "The Quiet Ward", art: "ward",       owner: "me",     meta: "Sky · Series" },
];

const suggestions = [
  { id: 101, title: "The Salt Road",   art: "harbour",    rt: 94, audience: "us",     meta: "2025 · Film · 2h 04m", why: "Because you finished The Long Ember" },
  { id: 102, title: "Vantage",         art: "moons",      rt: 89, audience: "me",     meta: "2026 · Series · 6 eps", why: "You're up to date on Cliffhold" },
  { id: 103, title: "Brightwater Bay", art: "fintan",     rt: 82, audience: "family", meta: "2024 · Series · 8 eps", why: "Like Small Kingdoms, but gentler" },
  { id: 104, title: "Winter Signal",   art: "nightglass", rt: 91, audience: "me",     meta: "2025 · Film · 1h 48m", why: "Because you finished The Long Ember" },
];

/* ── Brand mark ──────────────────────────────────────────── */
function Slats({ s = 24, c = brand }) {
  const bars = [
    { x: 16, h: 40, o: 0.45 },
    { x: 35, h: 68, o: 1 },
    { x: 54, h: 52, o: 0.78 },
    { x: 73, h: 26, o: 0.32 },
  ];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={50 - b.h / 2} width={11} height={b.h} rx={5.5} fill={c} opacity={b.o} />
      ))}
    </svg>
  );
}

/* ── Artwork surface ─────────────────────────────────────── */
function Art({ k, className = "", children, style }) {
  const p = art[k];
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: p.base, ...style }}>
      <div className="absolute" style={{ inset: "-30%", background: `radial-gradient(closest-side at 25% 20%, ${p.a} 0%, transparent 70%)`, opacity: 0.85 }} />
      <div className="absolute" style={{ inset: "-30%", background: `radial-gradient(closest-side at 80% 78%, ${p.b} 0%, transparent 72%)` }} />
      <div className="absolute" style={{ inset: "-30%", background: `radial-gradient(closest-side at 55% 108%, ${p.c} 0%, transparent 62%)`, opacity: 0.5, mixBlendMode: "screen" }} />
      <div className="absolute inset-0" style={{ backgroundImage: grain, opacity: 0.11, mixBlendMode: "overlay" }} />
      {children}
    </div>
  );
}

/* ── Ambient room light behind the whole app ─────────────── */
function Ambience({ k }) {
  const p = art[k];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div className="absolute rounded-full transition-all duration-1000 ease-out"
        style={{ width: 460, height: 460, top: -190, left: -120, background: p.a, opacity: 0.2, filter: "blur(90px)" }} />
      <div className="absolute rounded-full transition-all duration-1000 ease-out"
        style={{ width: 380, height: 380, top: 60, right: -150, background: p.tint, opacity: 0.16, filter: "blur(90px)" }} />
    </div>
  );
}

/* ── Hero carousel ───────────────────────────────────────── */
function Hero({ items, onFocus }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const card = el.scrollWidth / items.length;
    const i = Math.round(el.scrollLeft / card);
    if (i !== idx && items[i]) { setIdx(i); onFocus(items[i].art); }
  };

  return (
    <div>
      <div ref={ref} onScroll={onScroll}
        className="flex gap-4 overflow-x-auto no-bar snap-x snap-mandatory px-5 pb-1"
        style={{ scrollPaddingLeft: 20 }}>
        {items.map((it) => {
          const O = owners[it.owner].icon;
          return (
            <article key={it.id} className="snap-start shrink-0 press" style={{ width: "84%" }}>
              <Art k={it.art} className="rounded-[30px]" style={{ aspectRatio: "4/5", boxShadow: "0 22px 50px -20px rgba(21,20,15,0.55)" }}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,7,5,0.86) 4%, rgba(8,7,5,0.18) 46%, transparent 68%)" }} />

                {/* countdown, set as editorial type not a badge */}
                <div className="absolute top-6 left-6">
                  <div className="flex items-start gap-1.5">
                    <span style={{ fontFamily: ui, fontSize: 64, fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 0.82, color: "#fff" }}>
                      {it.days}
                    </span>
                    <span className="mt-1.5" style={{ fontFamily: ui, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>
                      {it.days === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>

                <button className="absolute top-6 right-5 flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-2 press"
                  style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(16px) saturate(160%)", border: "1px solid rgba(255,255,255,0.22)" }}>
                  <Bell size={12} color="#fff" strokeWidth={2.2} />
                  <span style={{ fontFamily: ui, fontSize: 11.5, fontWeight: 600, color: "#fff" }}>Remind me</span>
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-1.5 mb-2">
                    <O size={11} color="rgba(255,255,255,0.7)" strokeWidth={2.2} />
                    <span style={{ fontFamily: ui, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                      {owners[it.owner].label} · {it.where}
                    </span>
                  </div>
                  <h2 style={{ fontFamily: display, fontSize: 40, lineHeight: 0.95, color: "#fff", letterSpacing: "-0.015em" }}>{it.title}</h2>
                  <p style={{ fontFamily: ui, fontSize: 13, color: "rgba(255,255,255,0.68)", marginTop: 8 }}>{it.note}</p>
                </div>
              </Art>
            </article>
          );
        })}
        <div className="shrink-0 w-1" />
      </div>

      <div className="flex gap-1.5 px-5 mt-4">
        {items.map((_, i) => (
          <div key={i} className="h-[3px] rounded-full transition-all duration-400"
            style={{ width: i === idx ? 22 : 7, background: i === idx ? brand : "rgba(21,20,15,0.16)" }} />
        ))}
      </div>
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────── */
function Heading({ children, action }) {
  return (
    <div className="px-5 flex items-baseline justify-between mb-4">
      <h3 style={{ fontFamily: display, fontSize: 25, color: ink, letterSpacing: "-0.01em" }}>{children}</h3>
      {action && <span style={{ fontFamily: ui, fontSize: 12.5, fontWeight: 500, color: inkFaint }}>{action}</span>}
    </div>
  );
}

/* ── Continue watching ───────────────────────────────────── */
function ContinueCard({ it }) {
  const p = art[it.art];
  return (
    <div className="shrink-0 press" style={{ width: 250 }}>
      <Art k={it.art} className="rounded-[22px]" style={{ aspectRatio: "16/10", boxShadow: "0 14px 30px -16px rgba(21,20,15,0.5)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,7,5,0.6), transparent 60%)" }} />
        <button className="absolute inset-0 m-auto w-12 h-12 rounded-full flex items-center justify-center press"
          style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(14px) saturate(160%)", border: "1px solid rgba(255,255,255,0.3)" }}>
          <Play size={16} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 2 }} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3">
          <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.22)" }}>
            <div className="h-full rounded-full" style={{ width: `${it.pct}%`, background: "#fff" }} />
          </div>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: ui, fontSize: 11.5, fontWeight: 600, color: "#fff" }}>{it.sub}</span>
            <span style={{ fontFamily: ui, fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{it.where}</span>
          </div>
        </div>
      </Art>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.tint }} />
        <p style={{ fontFamily: ui, fontSize: 14, fontWeight: 600, color: ink, letterSpacing: "-0.01em" }}>{it.title}</p>
        <span style={{ fontFamily: ui, fontSize: 11.5, color: inkFaint }}>· {owners[it.owner].short}</span>
      </div>
    </div>
  );
}

/* ── Watchlist grid ──────────────────────────────────────── */
function SavedCard({ it }) {
  const O = owners[it.owner].icon;
  return (
    <div className="press">
      <Art k={it.art} className="rounded-[20px]" style={{ aspectRatio: "3/4", boxShadow: "0 10px 24px -14px rgba(21,20,15,0.45)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,7,5,0.5), transparent 55%)" }} />
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.24)" }}>
          <O size={11} color="#fff" strokeWidth={2.2} />
        </div>
      </Art>
      <p className="mt-2.5" style={{ fontFamily: ui, fontSize: 13.5, fontWeight: 600, color: ink, letterSpacing: "-0.01em" }}>{it.title}</p>
      <p style={{ fontFamily: ui, fontSize: 11.5, color: inkFaint, marginTop: 1 }}>{it.meta}</p>
    </div>
  );
}

/* ── Discover ────────────────────────────────────────────── */
function ScoreBadge({ rt }) {
  const good = rt >= 90;
  return (
    <div className="flex items-center gap-1 rounded-full px-2 py-1"
      style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.24)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: good ? "#6EE7A8" : "#F5D06A" }} />
      <span style={{ fontFamily: ui, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{rt}%</span>
    </div>
  );
}

function SuggestionCard({ it, onFocus }) {
  const O = owners[it.audience].icon;
  return (
    <div className="press" onMouseEnter={() => onFocus(it.art)} onTouchStart={() => onFocus(it.art)}>
      <Art k={it.art} className="rounded-[24px]" style={{ aspectRatio: "3/4", boxShadow: "0 14px 32px -16px rgba(21,20,15,0.5)" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,7,5,0.78) 6%, transparent 52%)" }} />
        <div className="absolute top-3 left-3"><ScoreBadge rt={it.rt} /></div>
        <button className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center press"
          style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.26)" }}>
          <Plus size={14} color="#fff" strokeWidth={2.4} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <O size={10} color="rgba(255,255,255,0.72)" strokeWidth={2.2} />
            <span style={{ fontFamily: ui, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>{owners[it.audience].label}</span>
          </div>
          <p style={{ fontFamily: display, fontSize: 21, lineHeight: 1.02, color: "#fff", letterSpacing: "-0.01em" }}>{it.title}</p>
        </div>
      </Art>
      <p className="mt-2.5" style={{ fontFamily: ui, fontSize: 12, fontWeight: 500, color: inkSoft, lineHeight: 1.35 }}>{it.why}</p>
      <p style={{ fontFamily: ui, fontSize: 11, color: inkFaint, marginTop: 2 }}>{it.meta}</p>
    </div>
  );
}

function Discover({ onFocus }) {
  const [threshold, setThreshold] = useState(75);
  const list = suggestions.filter((s) => s.rt >= threshold);
  return (
    <div className="pb-36">
      <header className="px-5 pt-7 pb-5 rise">
        <p style={{ fontFamily: ui, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint }}>Picked for you</p>
        <h1 style={{ fontFamily: display, fontSize: 34, color: ink, lineHeight: 1.05, marginTop: 2, letterSpacing: "-0.02em" }}>
          What to watch<span style={{ fontStyle: "italic" }}> next</span>
        </h1>
      </header>

      <div className="px-5 mb-7 rise" style={{ animationDelay: ".05s" }}>
        <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(14px)", border: `1px solid ${line}` }}>
          <div className="flex items-baseline justify-between mb-1">
            <span style={{ fontFamily: ui, fontSize: 12.5, fontWeight: 600, color: ink }}>Critic score floor</span>
            <span style={{ fontFamily: ui, fontSize: 26, fontWeight: 700, color: ink, letterSpacing: "-0.05em" }}>{threshold}%</span>
          </div>
          <input type="range" min={60} max={95} value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full mt-2" style={{ accentColor: brand }} />
          <p style={{ fontFamily: ui, fontSize: 11.5, color: inkFaint, marginTop: 8, lineHeight: 1.45 }}>
            Only titles scoring above this appear. Based on what you've finished — and shows you're fully caught up on.
          </p>
        </div>
      </div>

      <div className="px-5 flex items-baseline justify-between mb-4 rise" style={{ animationDelay: ".1s" }}>
        <h3 style={{ fontFamily: display, fontSize: 25, color: ink, letterSpacing: "-0.01em" }}>{list.length} suggestions</h3>
        <button className="flex items-center gap-1.5 press">
          <RefreshCw size={12} color={inkFaint} strokeWidth={2.2} />
          <span style={{ fontFamily: ui, fontSize: 12.5, fontWeight: 500, color: inkFaint }}>Refresh</span>
        </button>
      </div>

      <div className="px-5 grid grid-cols-2 gap-x-3.5 gap-y-7 rise" style={{ animationDelay: ".14s" }}>
        {list.map((it) => <SuggestionCard key={it.id} it={it} onFocus={onFocus} />)}
      </div>

      {list.length === 0 && (
        <div className="px-5 pt-8 text-center">
          <p style={{ fontFamily: display, fontSize: 21, color: ink }}>Nothing clears that bar</p>
          <p style={{ fontFamily: ui, fontSize: 13, color: inkFaint, marginTop: 4 }}>Lower the score floor to see more.</p>
        </div>
      )}
    </div>
  );
}

/* ── Add sheet ───────────────────────────────────────────── */
function AddSheet({ onClose }) {
  const [who, setWho] = useState("me");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 fade-in" style={{ background: "rgba(21,20,15,0.4)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div className="relative w-full max-w-[430px] rounded-t-[34px] px-5 pt-3 pb-8 sheet-up"
        style={{ background: paper, boxShadow: "0 -20px 60px rgba(21,20,15,0.2)" }}>
        <div className="w-10 h-[4px] rounded-full mx-auto mb-5" style={{ background: "rgba(21,20,15,0.13)" }} />
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: display, fontSize: 27, color: ink }}>Add a title</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center press" style={{ background: "rgba(21,20,15,0.06)" }}>
            <X size={15} color={inkSoft} />
          </button>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3.5 mb-5" style={{ background: "rgba(21,20,15,0.045)" }}>
          <Search size={16} color={inkFaint} />
          <span style={{ fontFamily: ui, fontSize: 15, color: inkFaint }}>Search shows and films…</span>
        </div>

        <p className="mb-2.5" style={{ fontFamily: ui, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: inkFaint }}>Watching with</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {Object.entries(owners).map(([k, o]) => (
            <button key={k} onClick={() => setWho(k)} className="rounded-2xl py-4 flex flex-col items-center gap-2 press transition-all duration-200"
              style={{
                background: who === k ? brand : "rgba(21,20,15,0.045)",
                color: who === k ? paper : inkSoft,
              }}>
              {React.createElement(o.icon, { size: 17, strokeWidth: 2 })}
              <span style={{ fontFamily: ui, fontSize: 12.5, fontWeight: 600 }}>{o.label}</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 press" style={{ background: brand }}>
          <Check size={16} color={paper} strokeWidth={2.4} />
          <span style={{ fontFamily: ui, fontSize: 15.5, fontWeight: 600, color: paper }}>Add to Pict</span>
        </button>
      </div>
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────── */
export default function Pict() {
  const [ctx, setCtx] = useState("all");
  const [mood, setMood] = useState("cliffhold");
  const [add, setAdd] = useState(false);
  const [tab, setTab] = useState("home");

  const f = (arr) => (ctx === "all" ? arr : arr.filter((i) => i.owner === ctx));
  const up = useMemo(() => f(upcoming), [ctx]);
  const wa = useMemo(() => f(watching), [ctx]);
  const sa = useMemo(() => f(saved), [ctx]);

  useEffect(() => { if (up[0]) setMood(up[0].art); }, [ctx]);

  return (
    <div className="relative w-full max-w-[430px] mx-auto min-h-[100dvh] overflow-hidden" style={{ background: paper, fontFamily: ui }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
        .no-bar::-webkit-scrollbar{display:none}
        .no-bar{-ms-overflow-style:none;scrollbar-width:none}
        .press{transition:transform .28s cubic-bezier(.2,.8,.3,1)}
        .press:active{transform:scale(.972)}
        @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .rise{animation:rise .7s cubic-bezier(.2,.8,.3,1) both}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .fade-in{animation:fadeIn .3s ease both}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:none}}
        .sheet-up{animation:sheetUp .42s cubic-bezier(.2,.9,.25,1) both}
        @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      <Ambience k={mood} />

      <div className="relative" style={{ zIndex: 1 }}>
        {tab === "discover" && <Discover onFocus={setMood} />}
        {tab !== "discover" && <>
        {/* Header */}
        <header className="px-5 pt-7 pb-5 flex items-start justify-between rise">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Slats s={17} />
              <span style={{ fontFamily: display, fontSize: 17, color: ink, letterSpacing: "-0.025em", lineHeight: 1 }}>Pict</span>
            </div>
            <p style={{ fontFamily: ui, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint }}>Tuesday evening</p>
            <h1 style={{ fontFamily: display, fontSize: 34, color: ink, lineHeight: 1.05, marginTop: 2, letterSpacing: "-0.02em" }}>
              Up next<span style={{ fontStyle: "italic" }}> for you</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button className="w-10 h-10 rounded-full flex items-center justify-center press" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)", border: `1px solid ${line}` }}>
              <Search size={16} color={inkSoft} />
            </button>
            <button onClick={() => setAdd(true)} className="w-10 h-10 rounded-full flex items-center justify-center press" style={{ background: brand }}>
              <Plus size={18} color={paper} strokeWidth={2.4} />
            </button>
          </div>
        </header>

        {/* Context filter */}
        <div className="px-5 pb-6 flex gap-2 rise" style={{ animationDelay: ".05s" }}>
          {[{ k: "all", label: "Everyone" }, ...Object.entries(owners).map(([k, o]) => ({ k, label: o.label }))].map(({ k, label }) => (
            <button key={k} onClick={() => setCtx(k)} className="rounded-full px-4 py-2 press transition-all duration-250"
              style={{
                background: ctx === k ? brand : "rgba(255,255,255,0.68)",
                color: ctx === k ? paper : inkSoft,
                border: `1px solid ${ctx === k ? brand : line}`,
                backdropFilter: "blur(10px)",
                fontFamily: ui, fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.005em",
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="pb-36">
          {up.length > 0 && (
            <div className="rise" style={{ animationDelay: ".1s" }}>
              <Hero items={up} onFocus={setMood} />
            </div>
          )}

          {wa.length > 0 && (
            <section className="mt-11 rise" style={{ animationDelay: ".16s" }}>
              <Heading action="History">Keep going</Heading>
              <div className="flex gap-3.5 px-5 overflow-x-auto no-bar snap-x">
                {wa.map((it) => <div key={it.id} className="snap-start"><ContinueCard it={it} /></div>)}
                <div className="shrink-0 w-1" />
              </div>
            </section>
          )}

          {sa.length > 0 && (
            <section className="mt-11 px-5 rise" style={{ animationDelay: ".22s" }}>
              <div className="flex items-baseline justify-between mb-4 -mx-5 px-5">
                <h3 style={{ fontFamily: display, fontSize: 25, color: ink, letterSpacing: "-0.01em" }}>Saved for later</h3>
                <span style={{ fontFamily: ui, fontSize: 12.5, fontWeight: 500, color: inkFaint }}>{sa.length} titles</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-6">
                {sa.map((it) => <SavedCard key={it.id} it={it} />)}
              </div>
            </section>
          )}

          {up.length + wa.length + sa.length === 0 && (
            <div className="px-5 pt-16 text-center">
              <Sparkles size={22} color={inkFaint} className="mx-auto mb-3" />
              <p style={{ fontFamily: display, fontSize: 22, color: ink }}>Nothing here yet</p>
              <p style={{ fontFamily: ui, fontSize: 13.5, color: inkFaint, marginTop: 4 }}>Tap + to add a show or film.</p>
            </div>
          )}
        </div>
        </>}
      </div>

      {/* Floating tab bar */}
      <nav className="fixed bottom-5 left-0 right-0 flex justify-center" style={{ zIndex: 20 }}>
        <div className="flex items-center gap-1 rounded-full p-1.5"
          style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(24px) saturate(180%)", border: `1px solid ${line}`, boxShadow: "0 12px 34px -10px rgba(21,20,15,0.24)" }}>
          {[
            { k: "home", Icon: LayoutGrid, label: "Home" },
            { k: "discover", Icon: Sparkles, label: "Discover" },
            { k: "cal", Icon: CalendarDays, label: "Calendar" },
            { k: "me", Icon: User, label: "Me" },
          ].map(({ k, Icon, label }) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2.5 press transition-all duration-300"
                style={{ background: on ? brand : "transparent" }}>
                <Icon size={16} color={on ? paper : inkSoft} strokeWidth={on ? 2.2 : 1.9} />
                {on && <span style={{ fontFamily: ui, fontSize: 12.5, fontWeight: 600, color: paper }}>{label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {add && <AddSheet onClose={() => setAdd(false)} />}
    </div>
  );
}
