import jpeg from "jpeg-js";
import type { Palette } from "./tmdb";
import { TMDB_IMG, IMG_SIZE } from "./constants";

// Server-side dominant-colour extraction (PRD non-negotiable: never client-side).
// Decode the tiny w154 poster with pure-JS jpeg-js (Workers-safe, no canvas),
// coarse-quantise, then split into a dark "ground" (base) and vivid glow colours
// (a/b/c/tint). The glows are deliberately vivified so even a dark, desaturated
// poster produces a palette with life in the ambient wash. Any failure returns a
// neutral oxblood-derived fallback.

const FALLBACK: Palette = {
  base: "#2A1418",
  a: "#8C3A46",
  b: "#5A2830",
  c: "#D19AA3",
  tint: "#B36672",
};

export async function extractPalette(posterPath: string | null): Promise<Palette> {
  if (!posterPath) return FALLBACK;
  try {
    const res = await fetch(`${TMDB_IMG}/${IMG_SIZE.palette}${posterPath}`);
    if (!res.ok) return FALLBACK;
    const buf = new Uint8Array(await res.arrayBuffer());
    const { data, width, height } = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    return paletteFromPixels(data, width, height);
  } catch {
    return FALLBACK;
  }
}

// ── Colour maths ────────────────────────────────────────────────────────────
interface Cluster { r: number; g: number; b: number; weight: number; hsl: [number, number, number] }

function paletteFromPixels(data: Uint8Array, width: number, height: number): Palette {
  const buckets = new Map<number, { r: number; g: number; b: number; weight: number }>();
  const step = 4; // sample every 4px each axis — plenty for a 154px poster
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = (Math.round(r / 51) << 8) | (Math.round(g / 51) << 4) | Math.round(b / 51);
      const c = buckets.get(key);
      if (c) { c.r += r; c.g += g; c.b += b; c.weight++; }
      else buckets.set(key, { r, g, b, weight: 1 });
    }
  }

  const clusters: Cluster[] = [...buckets.values()]
    .map((c) => {
      const r = c.r / c.weight, g = c.g / c.weight, b = c.b / c.weight;
      return { r, g, b, weight: c.weight, hsl: rgbToHsl(r, g, b) };
    })
    .sort((p, q) => q.weight - p.weight)
    .slice(0, 10);

  if (clusters.length === 0) return FALLBACK;

  const byLight = [...clusters].sort((p, q) => p.hsl[2] - q.hsl[2]);
  const base = byLight[0]; // darkest cluster = the artwork ground

  // Vibrance favours saturated, reasonably-lit, well-covered clusters.
  const vibe = (c: Cluster) => c.hsl[1] * (0.35 + 0.65 * Math.min(1, c.hsl[2] * 2)) * Math.sqrt(c.weight);
  const byVibe = [...clusters].sort((p, q) => vibe(q) - vibe(p));

  const aC = byVibe[0];
  const bC = byVibe.find((c) => c !== aC && hueGap(c.hsl[0], aC.hsl[0]) > 0.08) ?? byVibe[1] ?? aC;
  const cC = byLight[byLight.length - 1]; // lightest cluster

  // Glow colours: keep the hue, force enough saturation + mid lightness to read.
  const aHsl = vivify(aC.hsl);
  const bHue = hueGap(bC.hsl[0], aC.hsl[0]) > 0.05 ? bC.hsl[0] : (aC.hsl[0] + 0.12) % 1;
  const bHsl = vivify([bHue, bC.hsl[1], bC.hsl[2]]);

  return {
    base: hex(base.r, base.g, base.b),
    a: hslHex(aHsl),
    b: hslHex(bHsl),
    c: hslHex([cC.hsl[0], Math.min(cC.hsl[1], 0.35), Math.max(cC.hsl[2], 0.82)]),
    tint: hslHex([aC.hsl[0], 0.42, 0.72]),
  };
}

// Push a colour to a punchy version so the wash has life even from dark art.
function vivify([h, s, l]: [number, number, number]): [number, number, number] {
  return [h, Math.max(s, 0.55), Math.min(Math.max(l, 0.42), 0.6)];
}

function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
}

function hex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hslHex([h, s, l]: [number, number, number]): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return hex(r, g, b);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const t = (x: number) => {
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255];
}
