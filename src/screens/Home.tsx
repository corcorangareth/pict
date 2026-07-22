import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

// Phase 3 fills this in: hero carousel, ambient colour, rails, grid.
export function Home() {
  return (
    <div style={{ paddingBottom: 140 }}>
      <EmptyState
        title="Nothing here yet"
        body="Tap + to add a show or film."
        icon={<Sparkles size={22} color="var(--ink-faint)" style={{ margin: "0 auto" }} />}
      />
    </div>
  );
}
