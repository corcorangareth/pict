import { useState, type CSSProperties, type ReactNode } from "react";
import type { Palette } from "@/types";

// The artwork surface. Shows the real poster/backdrop when we have one, over a
// palette-derived ground (so there's no layout shift while it loads and a
// graceful fallback if it's missing). The palette still drives the ambient wash
// elsewhere — the colour info is never thrown away.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const FALLBACK: Palette = { base: "#2A1418", a: "#8C3A46", b: "#5A2830", c: "#D19AA3", tint: "#B36672" };

export function Art({
  palette,
  radius,
  style,
  children,
  imageSrc,
  imageAlt,
  eager = false,
}: {
  palette: Palette | null;
  radius: number;
  style?: CSSProperties;
  children?: ReactNode;
  /** Real poster/backdrop URL. Falls back to the colour blend when absent/failed. */
  imageSrc?: string | null;
  imageAlt?: string;
  /** Load immediately (above-the-fold hero) rather than lazily. */
  eager?: boolean;
}) {
  const p = palette ?? FALLBACK;
  const [failed, setFailed] = useState(false);
  const showImage = !!imageSrc && !failed;

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
      {/* Colour-blend fallback — visible until/unless a real image covers it. */}
      <div style={{ position: "absolute", inset: "-30%", background: `radial-gradient(closest-side at 25% 20%, ${p.a} 0%, transparent 70%)`, opacity: 0.85 }} />
      <div style={{ position: "absolute", inset: "-30%", background: `radial-gradient(closest-side at 80% 78%, ${p.b} 0%, transparent 72%)` }} />
      <div style={{ position: "absolute", inset: "-30%", background: `radial-gradient(closest-side at 55% 108%, ${p.c} 0%, transparent 62%)`, opacity: 0.5, mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, opacity: 0.11, mixBlendMode: "overlay" }} />

      {showImage && (
        <img
          src={imageSrc!}
          alt={imageAlt ?? ""}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}

      {children}
    </div>
  );
}
