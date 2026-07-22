import { EmptyState } from "@/components/EmptyState";

// The "Me" tab. Phase 7 adds the critic-score slider; Phase 5 the notification toggle.
export function Settings() {
  return (
    <div style={{ paddingBottom: 140 }}>
      <EmptyState title="Settings" body="Critic score, notifications, and install options live here." />
    </div>
  );
}
