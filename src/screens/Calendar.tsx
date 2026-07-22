import { EmptyState } from "@/components/EmptyState";

// Phase 6 fills this in: month grid of episodes + releases.
export function Calendar() {
  return (
    <div style={{ paddingBottom: 140 }}>
      <EmptyState title="Calendar" body="Upcoming episodes and streaming dates will land here." />
    </div>
  );
}
