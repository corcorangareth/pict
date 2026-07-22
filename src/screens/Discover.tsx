import { EmptyState } from "@/components/EmptyState";

// Phase 7 fills this in: threshold slider, suggestion grid, refresh.
export function Discover() {
  return (
    <div style={{ paddingBottom: 140 }}>
      <EmptyState title="What to watch next" body="Suggestions arrive once you've finished a few things." />
    </div>
  );
}
