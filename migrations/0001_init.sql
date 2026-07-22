-- Pict initial schema. See BUILD.md §2.
-- A tracked show or film. One row per TMDB title, shared across audiences.
CREATE TABLE titles (
  id            INTEGER PRIMARY KEY,
  tmdb_id       INTEGER NOT NULL,
  imdb_id       TEXT,
  media_type    TEXT NOT NULL,        -- 'tv' | 'movie'
  name          TEXT NOT NULL,
  overview      TEXT,
  poster_path   TEXT,
  backdrop_path TEXT,
  art_palette   TEXT,                 -- JSON {base,a,b,c,tint}
  first_air     TEXT,
  runtime       INTEGER,
  genres        TEXT,                 -- JSON string[]
  networks      TEXT,                 -- JSON string[]
  tmdb_vote     REAL,
  rt_score      INTEGER,              -- Rotten Tomatoes %, or NULL
  critic_score  INTEGER NOT NULL,     -- resolved gate value 0-100
  rt_checked_at TEXT,
  created_at    TEXT NOT NULL,
  UNIQUE(tmdb_id, media_type)
);

-- My relationship to a title. One entry per audience.
CREATE TABLE entries (
  id            INTEGER PRIMARY KEY,
  title_id      INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  audience      TEXT NOT NULL,        -- 'me' | 'us' | 'family'
  state         TEXT NOT NULL,        -- 'saved' | 'watching' | 'completed' | 'abandoned'
  notify        INTEGER NOT NULL DEFAULT 1,
  added_at      TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE(title_id, audience)
);

-- Episode-level progress (TV only).
CREATE TABLE episodes (
  id            INTEGER PRIMARY KEY,
  title_id      INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  season        INTEGER NOT NULL,
  number        INTEGER NOT NULL,
  name          TEXT,
  air_date      TEXT,
  watched_at    TEXT,                 -- NULL = unwatched
  notified_at   TEXT,                 -- NULL = not yet pushed
  UNIQUE(title_id, season, number)
);

-- Streaming availability (films). Region IE.
CREATE TABLE releases (
  id            INTEGER PRIMARY KEY,
  title_id      INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  provider      TEXT,
  release_date  TEXT NOT NULL,
  notified_at   TEXT,
  UNIQUE(title_id, provider)
);

-- Push subscription (single row in practice).
CREATE TABLE push_subs (
  id            INTEGER PRIMARY KEY,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Cached AI suggestions.
CREATE TABLE suggestions (
  id            INTEGER PRIMARY KEY,
  tmdb_id       INTEGER NOT NULL,
  media_type    TEXT NOT NULL,
  audience      TEXT NOT NULL,
  payload       TEXT NOT NULL,        -- JSON {name,poster_path,critic_score,rt_score,reason,meta}
  generated_at  TEXT NOT NULL,
  UNIQUE(tmdb_id, media_type)
);

-- Single-row app settings.
CREATE TABLE settings (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  critic_threshold  INTEGER NOT NULL DEFAULT 75,
  soft_prompt_seen  INTEGER NOT NULL DEFAULT 0,
  updated_at        TEXT NOT NULL
);

CREATE INDEX idx_entries_state      ON entries(state);
CREATE INDEX idx_entries_title      ON entries(title_id);
CREATE INDEX idx_episodes_title     ON episodes(title_id);
CREATE INDEX idx_episodes_air       ON episodes(air_date);
CREATE INDEX idx_episodes_unwatched ON episodes(title_id, watched_at);
CREATE INDEX idx_releases_title     ON releases(title_id);
CREATE INDEX idx_titles_tmdb        ON titles(tmdb_id, media_type);
