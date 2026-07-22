import jpeg from "jpeg-js";
import type { Palette } from "./tmdb";
import { TMDB_IMG, IMG_SIZE } from "./constants";

// Server-side dominant-colour extraction (PRD non-negotiable: never client-side).
// Decode the tiny w154 poster with pure-JS jpeg-js (Workers-safe, no canvas),
// coarse-quantise, pick dominant clusters, map to the {base,a,b,c,tint} shape
// the UI consumes. Any failure returns a neutral oxblood-derived fallback.

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
interface Cluster { r: number; g: number; b: number; weight: number }

function paletteFromPixels(data: Uint8Array, width: number, height: number): Palette {
  const buckets = new Map<number, Cluster>();
  const step = 4; // sample every 4px each axis — plenty for a 154px poster
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Coarse-quantise to 6 levels/channel so similar colours merge.
      const key = (Math.round(r / 51) << 8) | (Math.round(g / 51) << 4) | Math.round(b / 51);
      const c = buckets.get(key);
      if (c) { c.r += r; c.g += g; c.b += b; c.weight++; }
      else buckets.set(key, { r, g, b, weight: 1 });
    }
  }

  const clusters = [...buckets.values()]
    .map((c) => ({ r: c.r / c.weight, g: c.g / c.weight, b: c.b / c.weight, weight: c.weight }))
    .sort((p, q) => q.weight - p.weight)
    .slice(0, 8);

  if (clusters.length === 0) return FALLBACK;

  const withHsl = clusters.map((c) => ({ ...c, hsl: rgbToHsl(c.r, c.g, c.b) }));
  const byLight = [...withHsl].sort((p, q) => p.hsl[2] - q.hsl[2]);
  const bySat = [...withHsl].sort((p, q) => q.hsl[1] - p.hsl[1]);

  const base = byLight[0];
  const a = bySat[0];
  const b = bySat.find((c) => c !== a && Math.abs(c.hsl[0] - a.hsl[0]) > 0.08) ?? bySat[1] ?? a;
  const c = byLight[byLight.length - 1];
  const tintRgb = lighten(a.r, a.g, a.b, 0.18);

  return {
    base: hex(base.r, base.g, base.b),
    a: hex(a.r, a.g, a.b),
    b: hex(b.r, b.g, b.b),
    c: hex(c.r, c.g, c.b),
    tint: hex(tintRgb[0], tintRgb[1], tintRgb[2]),
  };
}

function hex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
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

function lighten(r: number, g: number, b: number, amt: number): [number, number, number] {
  return [r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt];
}
