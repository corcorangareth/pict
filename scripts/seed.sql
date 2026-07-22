-- Dev seed (BUILD.md §2.4). Idempotent. Palettes match the mockup cast so the
-- UI renders real moods. Run: npm run db:seed
INSERT OR IGNORE INTO titles
  (id, tmdb_id, imdb_id, media_type, name, overview, poster_path, backdrop_path, art_palette, first_air, runtime, genres, networks, tmdb_vote, rt_score, critic_score, created_at)
VALUES
  (1, 900001, 'tt9000001', 'tv', 'Cliffhold', 'A coastal town keeps its secrets.', NULL, NULL,
   '{"base":"#0A2530","a":"#4FD1C5","b":"#0E5E7A","c":"#BCF3EA","tint":"#7FD8D0"}', '2022-09-01', 52,
   '["Drama","Thriller"]', '["Apple TV+"]', 8.4, 91, 91, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (2, 900002, 'tt9000002', 'movie', 'The Long Ember', 'A slow-burn western.', NULL, NULL,
   '{"base":"#2B0F08","a":"#FF8A4C","b":"#C2321F","c":"#FFD9A8","tint":"#F0A07A"}', '2025-03-14', 132,
   '["Drama","Western"]', '["A24"]', 7.9, 88, 88, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (3, 900003, 'tt9000003', 'tv', 'Small Kingdoms', 'Court intrigue, small stakes.', NULL, NULL,
   '{"base":"#231206","a":"#F0B24A","b":"#8A4B12","c":"#FFE9BC","tint":"#E8BE7E"}', '2023-11-02', 48,
   '["Drama","History"]', '["Netflix"]', 8.1, 84, 84, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (4, 900004, 'tt9000004', 'tv', 'The Quiet Ward', 'Nights in an old hospital.', NULL, NULL,
   '{"base":"#101A22","a":"#8FB4CC","b":"#2A4356","c":"#D9E8F0","tint":"#A9C4D6"}', '2026-01-20', 50,
   '["Drama","Mystery"]', '["Sky"]', 7.6, 79, 79, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO entries (id, title_id, audience, state, notify, added_at, updated_at) VALUES
  (1, 1, 'us', 'watching', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (2, 2, 'me', 'completed', 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (3, 3, 'family', 'watching', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (4, 4, 'me', 'saved', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO episodes (id, title_id, season, number, name, air_date, watched_at) VALUES
  (1, 1, 2, 3, 'The Tide Turns', '2026-07-01', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (2, 1, 2, 4, 'Undertow', '2026-07-08', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (3, 1, 2, 5, 'Slack Water', '2026-07-29', NULL),
  (4, 3, 1, 6, 'The Envoy', '2026-07-10', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (5, 3, 1, 7, 'The Ledger', '2026-07-24', NULL);

INSERT OR IGNORE INTO releases (id, title_id, provider, release_date) VALUES
  (1, 2, 'Netflix', '2026-08-01');
