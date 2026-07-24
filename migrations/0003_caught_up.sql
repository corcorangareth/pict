-- Track when an entry was last "up to date" (all aired episodes watched), so the
-- hero can feature only shows you've caught up on at least once; shows you've
-- never caught up on stay in Keep Going. See src/lib/spotlight.ts.
ALTER TABLE entries ADD COLUMN caught_up_at TEXT;

-- Best-effort backfill for existing data: completed entries, and TV entries
-- you've watched with at most a couple of unwatched aired episodes (i.e. you
-- were essentially up to date). Brand-new/never-started shows are left null.
UPDATE entries
SET caught_up_at = updated_at
WHERE caught_up_at IS NULL
  AND (
    state = 'completed'
    OR (
      (SELECT COUNT(*) FROM episodes ep WHERE ep.title_id = entries.title_id AND ep.watched_at IS NOT NULL) > 0
      AND (SELECT COUNT(*) FROM episodes ep WHERE ep.title_id = entries.title_id AND ep.air_date <= date('now') AND ep.watched_at IS NULL) <= 2
    )
  );
