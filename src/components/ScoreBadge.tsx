// Critic-score chip. Red dot = real Rotten Tomatoes; neutral dot = derived from
// TMDB vote (still called "Critic score" everywhere — BUILD.md §0.1 / §5).
export function ScoreBadge({ rtScore, criticScore }: { rtScore: number | null; criticScore: number }) {
  const isRt = rtScore != null && rtScore > 0;
  const value = isRt ? rtScore : criticScore;
  if (!value) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px 4px 6px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.14)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.22)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        fontVariantNumeric: "tabular-nums",
      }}
      aria-label={isRt ? `Rotten Tomatoes ${value} percent` : `Critic score ${value}`}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isRt ? "#FA320A" : "rgba(255,255,255,0.75)",
        }}
      />
      {value}
    </div>
  );
}
