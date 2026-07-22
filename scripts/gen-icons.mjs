// Render the Slats mark to the PWA icon set. Run: npm run icons
// "any" icons: mark at 60% optical size on brand. Maskable: 20% safe-zone padding.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BRAND = "#8C3A46";
const PAPER = "#FBFAF8";
const OUT = new URL("../public/icons/", import.meta.url);

function slats(color) {
  const bars = [
    { x: 16, h: 40, o: 0.45 },
    { x: 35, h: 68, o: 1 },
    { x: 54, h: 52, o: 0.78 },
    { x: 73, h: 26, o: 0.32 },
  ];
  return bars
    .map(
      (b) =>
        `<rect x="${b.x}" y="${50 - b.h / 2}" width="11" height="${b.h}" rx="5.5" fill="${color}" opacity="${b.o}"/>`,
    )
    .join("");
}

// glyphScale = fraction of the canvas the 100x100 mark occupies (centred).
function iconSvg(size, { bg, glyph, radius, glyphScale }) {
  const g = size * glyphScale;
  const offset = (size - g) / 2;
  const r = size * radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
    <g transform="translate(${offset},${offset}) scale(${g / 100})">${slats(glyph)}</g>
  </svg>`;
}

async function png(name, size, opts) {
  const svg = iconSvg(size, opts);
  await sharp(Buffer.from(svg)).png().toFile(new URL(name, OUT).pathname);
  console.log("wrote", name);
}

await mkdir(OUT, { recursive: true });

// Standard icons: squircle at 22.5% corner radius, mark at 60%.
await png("icon-192.png", 192, { bg: BRAND, glyph: PAPER, radius: 0.225, glyphScale: 0.6 });
await png("icon-512.png", 512, { bg: BRAND, glyph: PAPER, radius: 0.225, glyphScale: 0.6 });
// Maskable: full-bleed background, mark shrunk into the safe zone (~48%).
await png("icon-maskable-192.png", 192, { bg: BRAND, glyph: PAPER, radius: 0, glyphScale: 0.48 });
await png("icon-maskable-512.png", 512, { bg: BRAND, glyph: PAPER, radius: 0, glyphScale: 0.48 });
// Apple touch icon: no transparency, square (iOS masks it).
await png("apple-touch-icon.png", 180, { bg: BRAND, glyph: PAPER, radius: 0, glyphScale: 0.6 });
