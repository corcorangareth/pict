import type { ReactNode } from "react";

// Empty states are an invitation, not an apology (PRD §8 voice).
export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <div style={{ padding: "64px 20px 0", textAlign: "center" }}>
      {icon && <div style={{ marginBottom: 12 }}>{icon}</div>}
      <p style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ink)" }}>
        {title}
      </p>
      <p style={{ fontSize: 15, color: "var(--ink-faint)", marginTop: 6 }}>{body}</p>
    </div>
  );
}
