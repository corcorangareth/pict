import { owners, audienceOrder } from "@/lib/audience";
import type { Audience } from "@/types";

export type AudienceFilterValue = "all" | Audience;

// Everyone / Me / Us Two / Family — re-filters every section below (PRD §7).
export function AudienceFilter({
  value,
  onChange,
}: {
  value: AudienceFilterValue;
  onChange: (v: AudienceFilterValue) => void;
}) {
  const options: { k: AudienceFilterValue; label: string }[] = [
    { k: "all", label: "Everyone" },
    ...audienceOrder.map((k) => ({ k, label: owners[k].label })),
  ];
  return (
    <div className="no-bar" style={{ padding: "0 20px 24px", display: "flex", gap: 8, overflowX: "auto" }}>
      {options.map(({ k, label }) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(k)}
            className="press"
            style={{
              borderRadius: "var(--r-pill)",
              padding: "10px 18px",
              background: on ? "var(--brand)" : "rgba(255,255,255,0.68)",
              color: on ? "var(--paper)" : "var(--ink-soft)",
              border: `1px solid ${on ? "var(--brand)" : "var(--line)"}`,
              backdropFilter: "blur(10px)",
              fontSize: 14.5,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "background 250ms var(--ease), color 250ms var(--ease)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
