// "Slats" — the Pict mark. Four rounded bars, a shelf of spines seen edge-on.
// PRD §8 non-negotiable: NEVER animate. No transition/animation rules here, ever.

interface SlatsProps {
  size?: number;
  color?: string;
  /** Solid opacity for all bars (used on small favicons). */
  solid?: boolean;
  title?: string;
}

const bars = [
  { x: 16, h: 40, o: 0.45 },
  { x: 35, h: 68, o: 1 },
  { x: 54, h: 52, o: 0.78 },
  { x: 73, h: 26, o: 0.32 },
];

export function Slats({ size = 24, color = "var(--brand)", solid = false, title }: SlatsProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={50 - b.h / 2}
          width={11}
          height={b.h}
          rx={5.5}
          fill={color}
          opacity={solid ? 1 : b.o}
        />
      ))}
    </svg>
  );
}
