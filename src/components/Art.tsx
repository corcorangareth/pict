import type { CSSProperties, ReactNode } from "react";
import type { Palette } from "@/types";

// The artwork surface. The app takes its mood from the title's palette
// (extracted server-side on add). Poster art stays the loudest thing on screen.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const FALLBACK: Palette = { base: "#2A1418", a: "#8C3A46", b: "#5A2830", c: "#D19AA3", tint: "#B36672" };

export function Art({
  palette,
  radius,
  style,
  children,
}: {
  palette: Palette | null;
  radius: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const p = palette ?? FALLBACK;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: p.base,
        borderRadius: radius,
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: "-30%", background: `radial-gradient(closest-side at 25% 20%, ${p.a} 0%, transparent 70%)`, opacity: 0.85 }} />
      <div style={{ position: "absolute", inset: "-30%", background: `radial-gradient(closest-side at 80% 78%, ${p.b} 0%, transparent 72%)` }} />
      <div style={{ position: "absolute", inset: "-30%", background: `radial-gradient(closest-side at 55% 108%, ${p.c} 0%, transparent 62%)`, opacity: 0.5, mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, opacity: 0.11, mixBlendMode: "overlay" }} />
      {children}
    </div>
  );
}
