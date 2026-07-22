import { createElement } from "react";
import { owners, audienceOrder } from "@/lib/audience";
import type { Audience } from "@/types";

// 3-up audience picker. Used in the Add sheet and (later) title detail.
export function AudiencePicker({
  value,
  onChange,
}: {
  value: Audience;
  onChange: (a: Audience) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {audienceOrder.map((k) => {
        const o = owners[k];
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(k)}
            className="press tap"
            style={{
              borderRadius: 16,
              padding: "16px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              background: on ? "var(--brand)" : "rgba(21,20,15,0.045)",
              color: on ? "var(--paper)" : "var(--ink-soft)",
              transition: "background 200ms var(--ease)",
            }}
          >
            {createElement(o.icon, { size: 17, strokeWidth: 2 })}
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
