import React, { useState } from "react";

/* ────────────────────────────────────────────────────────────
   PICT — Slats mark, colour exploration
   Locked: Oxblood #8C3A46.
   ──────────────────────────────────────────────────────────── */

const paper = "#FBFAF8";
const ink = "#15140F";
const inkSoft = "#57544B";
const inkFaint = "#9C978B";
const line = "rgba(21,20,15,0.08)";

const display = "'Instrument Serif', Georgia, serif";
const ui = "'Inter', -apple-system, sans-serif";

const OPTIONS = [
  {
    key: "plum", name: "Plum", hex: "#7B3F6B", tint: "#C99BBE",
    note: "Deep theatre-curtain purple. Furthest from anything else you ship, and it reads as evening — the time you actually open this app. Rich without being loud on a light background.",
  },
  {
    key: "ink", name: "Indigo", hex: "#2F4B7C", tint: "#93A9CE",
    note: "Cool, calm, quietly premium. The safest of the four and the one that lets poster artwork shout loudest, because it never competes for warmth.",
  },
  {
    key: "teal", name: "Deep Teal", hex: "#1F6F6B", tint: "#84C2BD",
    note: "Cinema-lobby green-blue. Distinct from Fiú's forest green by being much cooler and bluer. Feels considered rather than playful.",
  },
  {
    key: "clay", name: "Oxblood", hex: "#8C3A46", tint: "#D19AA3",
    note: "Old velvet seats. Still warm like Blasta but pulled decisively toward red-brown, so the two never get confused side by side.",
  },
];

/* ── The mark ────────────────────────────────────────────── */
function Slats({ s = 100, c = "#000", solid = false }) {
  const bars = [
    { x: 16, h: 40, o: 0.45 },
    { x: 35, h: 68, o: 1 },
    { x: 54, h: 52, o: 0.78 },
    { x: 73, h: 26, o: 0.32 },
  ];
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={50 - b.h / 2} width={11} height={b.h} rx={5.5}
          fill={c} opacity={solid ? 1 : b.o} />
      ))}
    </svg>
  );
}

function Icon({ size = 112, bg, glyph = paper, radius = 0.225 }) {
  return (
    <div style={{
      width: size, height: size, background: bg, borderRadius: size * radius,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 10px 26px -12px rgba(21,20,15,0.42)",
    }}>
      <Slats s={size * 0.6} c={glyph} />
    </div>
  );
}

function Word({ size = 40, color = ink, markColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <Slats s={size * 1.05} c={markColor} />
      <span style={{ fontFamily: display, fontSize: size, color, letterSpacing: "-0.025em", lineHeight: 1 }}>Pict</span>
    </div>
  );
}

function Chip({ hex, label, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 96 }}>
      <div style={{ height: 54, background: hex, borderRadius: 13, border: `1px solid ${line}` }} />
      <p style={{ fontFamily: ui, fontSize: 11.5, fontWeight: 600, color: ink, marginTop: 7 }}>{label}</p>
      <p style={{ fontFamily: ui, fontSize: 10.5, color: inkFaint }}>{hex}</p>
      {sub && <p style={{ fontFamily: ui, fontSize: 10.5, color: inkFaint }}>{sub}</p>}
    </div>
  );
}

export default function PictColour() {
  const [sel, setSel] = useState("clay");
  const o = OPTIONS.find((x) => x.key === sel);

  return (
    <div style={{ background: paper, minHeight: "100dvh", padding: "40px 24px 64px", fontFamily: ui }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
        .p{transition:transform .25s cubic-bezier(.2,.8,.3,1)} .p:active{transform:scale(.97)}`}</style>

      <div style={{ maxWidth: 620, margin: "0 auto" }}>

        <p style={{ fontFamily: ui, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint }}>Slats · colour</p>
        <h1 style={{ fontFamily: display, fontSize: 40, color: ink, letterSpacing: "-0.025em", lineHeight: 1.05, marginTop: 4 }}>
          Pick a<span style={{ fontStyle: "italic" }}> brand colour</span>
        </h1>

        {/* Picker */}
        <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
          {OPTIONS.map((x) => {
            const on = sel === x.key;
            return (
              <button key={x.key} onClick={() => setSel(x.key)} className="p"
                style={{
                  flex: "1 1 128px", background: on ? x.hex : "rgba(21,20,15,0.035)",
                  borderRadius: 20, padding: "18px 12px 14px", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                }}>
                <Slats s={42} c={on ? paper : x.hex} />
                <span style={{ fontFamily: ui, fontSize: 12, fontWeight: 600, color: on ? paper : inkSoft }}>{x.name}</span>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div style={{ marginTop: 38, paddingTop: 32, borderTop: `1px solid ${line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", marginBottom: 26 }}>
            <Slats s={116} c={o.hex} />
            <Slats s={116} c={ink} />
            <div style={{ background: o.hex, borderRadius: 24, padding: 22 }}>
              <Slats s={72} c={paper} />
            </div>
          </div>
          <p style={{ fontFamily: display, fontSize: 26, color: ink, letterSpacing: "-0.015em" }}>{o.name} · {o.hex}</p>
          <p style={{ fontFamily: ui, fontSize: 13.5, color: inkSoft, lineHeight: 1.6, marginTop: 10, maxWidth: 480 }}>{o.note}</p>
        </div>

        {/* Separation check */}
        <div style={{ marginTop: 42 }}>
          <p style={{ fontFamily: ui, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint, marginBottom: 14 }}>
            Sitting beside your other apps
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Chip hex="#C8512A" label="Blasta" sub="orange" />
            <Chip hex="#2F5D3F" label="Fiú" sub="forest" />
            <Chip hex={o.hex} label="Pict" sub={o.name.toLowerCase()} />
          </div>
          <p style={{ fontFamily: ui, fontSize: 12.5, color: inkSoft, lineHeight: 1.55, marginTop: 14, maxWidth: 480 }}>
            Three home-screen icons in a row. The test is whether you can tell them apart at a glance without reading a single label.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 18, alignItems: "center" }}>
            <Icon size={62} bg="#C8512A" />
            <Icon size={62} bg="#2F5D3F" />
            <Icon size={62} bg={o.hex} />
          </div>
        </div>

        {/* Palette */}
        <div style={{ marginTop: 42 }}>
          <p style={{ fontFamily: ui, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint, marginBottom: 14 }}>Full palette</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Chip hex={o.hex} label={o.name} sub="brand, primary action" />
            <Chip hex={o.tint} label="Tint" sub="hover, subtle fills" />
            <Chip hex={ink} label="Ink" sub="type, active states" />
            <Chip hex={paper} label="Paper" sub="background" />
          </div>
        </div>

        {/* Icons */}
        <div style={{ marginTop: 42 }}>
          <p style={{ fontFamily: ui, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint, marginBottom: 16 }}>App icon</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
            <Icon size={112} bg={o.hex} />
            <Icon size={72} bg={ink} />
            <Icon size={52} bg={o.hex} />
            <Icon size={40} bg={ink} />
          </div>
        </div>

        {/* Lockup */}
        <div style={{ marginTop: 42 }}>
          <p style={{ fontFamily: ui, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint, marginBottom: 18 }}>Lockup</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Word size={42} markColor={o.hex} />
            <Word size={30} markColor={ink} />
            <div style={{ background: ink, borderRadius: 18, padding: "20px 24px", display: "inline-flex", alignSelf: "flex-start" }}>
              <Word size={30} color={paper} markColor={paper} />
            </div>
          </div>
        </div>

        {/* In use */}
        <div style={{ marginTop: 42 }}>
          <p style={{ fontFamily: ui, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint, marginBottom: 16 }}>In use</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>

            <div style={{ width: 268, background: "#fff", borderRadius: 18, padding: 14, boxShadow: "0 8px 24px -12px rgba(21,20,15,0.3)", display: "flex", gap: 11, alignItems: "flex-start" }}>
              <Icon size={38} bg={o.hex} radius={0.24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: ui, fontSize: 11, fontWeight: 700, color: ink }}>Pict</p>
                <p style={{ fontFamily: ui, fontSize: 12.5, color: ink, marginTop: 2, lineHeight: 1.35 }}>Cliffhold — Season 3, Episode 1 is out</p>
              </div>
              <span style={{ fontFamily: ui, fontSize: 10.5, color: inkFaint }}>now</span>
            </div>

            <div style={{ width: 150, height: 244, background: o.hex, borderRadius: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <Slats s={56} c={paper} />
              <span style={{ fontFamily: display, fontSize: 30, color: paper, letterSpacing: "-0.025em" }}>Pict</span>
            </div>

            <div style={{ width: 200, background: paper, borderRadius: 20, border: `1px solid ${line}`, padding: 16 }}>
              <p style={{ fontFamily: ui, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: inkFaint }}>Tuesday evening</p>
              <p style={{ fontFamily: display, fontSize: 24, color: ink, lineHeight: 1.05, marginTop: 2 }}>
                Up next<span style={{ fontStyle: "italic" }}> for you</span>
              </p>
              <button style={{ marginTop: 14, background: o.hex, border: "none", borderRadius: 99, padding: "9px 16px", cursor: "pointer" }}>
                <span style={{ fontFamily: ui, fontSize: 12.5, fontWeight: 600, color: paper }}>Remind me</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
