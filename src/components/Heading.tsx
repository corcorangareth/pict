import type { ReactNode } from "react";

export function Heading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: "0 20px", display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
      <h3 style={{ fontSize: 26, letterSpacing: "-0.01em" }}>{children}</h3>
      {action && <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-faint)" }}>{action}</span>}
    </div>
  );
}
