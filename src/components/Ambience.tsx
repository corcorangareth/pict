import type { Palette } from "@/types";

// Two large blurred colour fields behind the whole app, from the focused
// title's palette. Transition 1000ms when the hero or audience filter changes
// (PRD §9). Never does client-side colour extraction — reads the stored palette.
const FALLBACK: Palette = { base: "#2A1418", a: "#8C3A46", b: "#5A2830", c: "#D19AA3", tint: "#B36672" };

export function Ambience({ palette }: { palette: Palette | null }) {
  const p = palette ?? FALLBACK;
  return (
    <div style={{ pointerEvents: "none", position: "fixed", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <div
        style={{
          position: "absolute", width: 460, height: 460, top: -190, left: -120,
          borderRadius: "50%", background: p.a, opacity: 0.2, filter: "blur(90px)",
          transition: "background var(--ambient-dur) ease-out",
        }}
      />
      <div
        style={{
          position: "absolute", width: 380, height: 380, top: 60, right: -150,
          borderRadius: "50%", background: p.tint, opacity: 0.16, filter: "blur(90px)",
          transition: "background var(--ambient-dur) ease-out",
        }}
      />
    </div>
  );
}
