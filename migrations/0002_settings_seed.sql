-- Seed the single settings row. See BUILD.md §2.3.
INSERT INTO settings (id, critic_threshold, soft_prompt_seen, updated_at)
VALUES (1, 75, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO NOTHING;
