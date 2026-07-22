import { dayLabel } from "@/lib/countdown";

// The countdown is typography, not a badge: large, tightly tracked, tabular.
export function Countdown({ days }: { days: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
      <span className="num" style={{ fontSize: 64, lineHeight: 0.82, color: "#fff" }}>
        {days}
      </span>
      <span
        style={{
          marginTop: 6,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        {dayLabel(days)}
      </span>
    </div>
  );
}
