# Pict — Product Requirements Document

**Owner:** Gareth
**Scope:** Personal-use PWA (single user). Not a commercial product.
**Status:** Ready for build
**Last updated:** 21 July 2026
**Name:** Pict — short, sharp, a nod to "pictures" (the films) and to the poster-forward design.

---

## 1. Why this exists

Track TV shows and films I'm watching or want to watch, and get a push notification the moment something drops. Existing trackers (Trakt, Simkl) either cap free tiers, show ads, or carry a monetisation roadmap I don't control. This is a small, fast, beautiful app that does exactly what I need and nothing more.

The one emotional job: **opening Pict should make me want to watch something tonight.**

---

## 2. Scope

### In scope (v1)
- Add TV shows and films to a personal library, tagged **Me**, **Us Two**, or **Family**
- Three list states: **Coming Up**, **Keep Going** (in progress), **Saved for later**
- Manual progress marking (tap to mark an episode or film watched)
- Web push notification for every new TV episode and for films arriving on streaming
- Browse/discover with AI suggestions filtered by a Rotten Tomatoes score threshold
- Full offline-capable PWA, installable to home screen

### Out of scope (v1)
- Multiple logins, accounts for wife or family (lists are labels on my single account)
- Auto-scrobbling from Plex/Netflix
- Importing history from Trakt/Simkl
- Ratings, reviews, social features, stats dashboards
- Cinema release alerts (streaming date only)

---

## 3. Data model (Cloudflare D1)

```sql
-- A tracked show or film
CREATE TABLE titles (
  id            INTEGER PRIMARY KEY,
  tmdb_id       INTEGER NOT NULL,
  media_type    TEXT NOT NULL,        -- 'tv' | 'movie'
  name          TEXT NOT NULL,
  overview      TEXT,
  poster_path   TEXT,
  backdrop_path TEXT,
  art_palette   TEXT,                 -- JSON: extracted dominant colours
  first_air     TEXT,
  UNIQUE(tmdb_id, media_type)
);

-- My relationship to a title
CREATE TABLE entries (
  id            INTEGER PRIMARY KEY,
  title_id      INTEGER NOT NULL REFERENCES titles(id),
  audience      TEXT NOT NULL,        -- 'me' | 'us' | 'family'
  state         TEXT NOT NULL,        -- 'saved' | 'watching' | 'completed' | 'abandoned'
  notify        INTEGER DEFAULT 1,
  added_at      TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Episode-level progress (TV only)
CREATE TABLE episodes (
  id            INTEGER PRIMARY KEY,
  title_id      INTEGER NOT NULL REFERENCES titles(id),
  season        INTEGER NOT NULL,
  number        INTEGER NOT NULL,
  name          TEXT,
  air_date      TEXT,
  watched_at    TEXT,                 -- NULL = unwatched
  UNIQUE(title_id, season, number)
);

-- Streaming availability (films)
CREATE TABLE releases (
  id            INTEGER PRIMARY KEY,
  title_id      INTEGER NOT NULL REFERENCES titles(id),
  provider      TEXT,                 -- 'Netflix', 'Apple TV+', ...
  release_date  TEXT NOT NULL,
  notified_at   TEXT
);

-- Push subscription (single row in practice)
CREATE TABLE push_subs (
  id            INTEGER PRIMARY KEY,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Cached AI suggestions
CREATE TABLE suggestions (
  id            INTEGER PRIMARY KEY,
  tmdb_id       INTEGER NOT NULL,
  media_type    TEXT NOT NULL,
  payload       TEXT NOT NULL,        -- JSON: name, poster, rt_score, reason
  generated_at  TEXT NOT NULL
);
```

---

## 4. External data

| Need | Source | Notes |
|---|---|---|
| Show/film metadata, posters, air dates | **TMDB API** | Free with API key. Primary source. |
| Streaming availability (IE region) | **TMDB `/watch/providers`** | Region `IE`. Poll to detect first streaming date. |
| Rotten Tomatoes scores | **OMDb API** | ⚠️ RT has no public API. OMDb returns RT ratings; free tier is 1,000 req/day. Cache aggressively in D1. Fall back to TMDB `vote_average` (scaled) if OMDb is unavailable. |
| AI suggestions | **Claude Haiku** | Via Cloudflare Worker binding. |

**Decision needed at build time:** confirm OMDb free tier still returns RT scores. If not, fall back to TMDB vote_average ≥ 7.5 as the quality gate and rename the setting "Critic score" rather than "Rotten Tomatoes".

---

## 5. Notifications

**Delivery:** Web Push (VAPID) to the installed PWA. No email.

**Cron:** Cloudflare Worker, scheduled daily at 08:00 Europe/Dublin.

**Logic each run:**
1. For every `entries` row with `state IN ('saved','watching')` and `notify = 1`:
   - **TV:** fetch TMDB season data. Any episode with `air_date` = today and no `notified_at` → queue push.
   - **Film:** check `/watch/providers` for region IE. First time a provider appears → queue push, write `releases` row.
2. Batch queued pushes into a single notification if more than three fire on the same day ("3 new episodes today").
3. Write `notified_at` so nothing double-fires.

**Notification copy:**
- TV: `Cliffhold — Season 3, Episode 1 is out` → deep-links to the title
- Film: `Under Two Moons is now on Netflix`
- Batched: `3 new episodes are out today`

**Permission flow:** Never prompt on first load. Show a soft in-app prompt the first time a title is added, explaining what the notification does. Only then request the browser permission.

### Notification actions — mark watched without opening the app

Every release notification carries action buttons via the Web Notifications `actions` array. This is the primary fast path for logging progress: the moment you finish an episode you've just been told about, you mark it from the notification shade.

| Notification | Actions |
|---|---|
| TV episode released | `Mark watched` · `Snooze` |
| Film now streaming | `Mark watched` · `Not yet` |
| Batched (3+ items) | `Open Pict` only — too ambiguous to act on in place |

**Implementation:**
- Include `data: { entryId, titleId, season, episode }` on the notification payload so the handler knows exactly what to write.
- Handle `notificationclick` in the service worker, branching on `event.action`.
- `Mark watched` → `POST /api/progress` with the payload data → `event.notification.close()`. Do **not** open a window.
- If the device is offline, push the write onto the same IndexedDB sync queue used by the app shell (see §11) and replay it on reconnect.
- Show a brief replacement notification confirming the write (`Marked watched — Cliffhold S3E1`), auto-dismissing after a few seconds. Silent, no vibration.
- `Snooze` re-queues the same notification for 24 hours. `Not yet` simply dismisses without writing.
- Android Chrome supports a maximum of two action buttons; never declare more.

**Why this and not voice:** Android's AppFunctions API (shipped early 2026) would let Gemini act on the app directly, but it requires a native Android app declaring the functions — Pict is a PWA, so it would mean wrapping in a TWA and writing an Android AppFunctions service. Notification actions cover the same moment for a fraction of the effort. Revisit AppFunctions only if a TWA gets built for Play Store distribution.

---

## 6. AI suggestions ("What to watch")

**Trigger:** Regenerated nightly by the same cron, cached in `suggestions`. Manual refresh available in the Discover tab.

**Eligibility rules — a title only counts as taste input if:**
- Film: `state = 'completed'`
- TV: `state = 'completed'`, **or** `state = 'watching'` **and I am fully up to date** (no aired, unwatched episodes)

Shows I'm behind on are deliberately excluded — being mid-binge doesn't mean I like it yet.

**Pipeline:**
1. Build a taste profile from eligible titles: genres, decades, runtime, tone, networks.
2. Pull TMDB `/discover` and `/recommendations` candidates, excluding anything already in `titles`.
3. Enrich candidates with RT scores; **hard-filter below the threshold** (default 75%, user-adjustable in Settings, range 60–95).
4. Send the taste profile + filtered candidate list to Claude Haiku. Ask for the top 8, each with a one-sentence reason grounded in what I've actually finished.
5. Haiku returns JSON only. Parse, validate, cache.

**Prompt requirements:**
- Reasons must reference a specific title I finished, not vague genre talk ("Because you finished Cliffhold" not "Because you like drama").
- Reasons capped at 90 characters — they render as one line under a poster.
- Suggestions are tagged with a suggested audience (Me / Us Two / Family) based on which lists the source titles came from.

---

## 7. Screens

### Home
- Header: contextual greeting + editorial title, search, add button
- Audience filter: Everyone / Me / Us Two / Family — re-filters every section below
- **Hero carousel** — Coming Up, soonest first, 4:5 artwork, countdown set as large typography, "Remind me" glass toggle
- **Keep Going** — horizontal rail, 16:10 art, progress line, next episode label
- **Saved for later** — two-column poster grid

### Discover
- Threshold control at top (score slider)
- Suggestion cards with poster, title, RT score badge, one-line reason
- Each card: add-to-list action with audience picker

### Title detail
- Full-bleed artwork header, overview, where to watch
- TV: season accordion, tap an episode to mark watched, "mark season watched"
- Film: single mark-watched action
- Notification toggle, audience toggle, remove from list

### Calendar
- Month grid of upcoming episodes and streaming dates across all lists

### Add sheet
- Search TMDB, pick type, pick audience, add

---

## 8. Brand

**Name:** Pict. Short for "pictures" — old slang for the cinema ("going to the pictures") — and a nod to the poster-forward, artwork-driven design. One syllable, easy to say, easy to theme.

**Mark — "Slats":** four vertical rounded bars, vertically centred, at heights 40 / 68 / 52 / 26 on a 100×100 grid, with opacities 0.45 / 1 / 0.78 / 0.32. Bar width 11, corner radius 5.5, x positions 16 / 35 / 54 / 73. Reads as a shelf of spines seen edge-on — a queue of things lined up waiting.

- **App icon:** mark at 58–60% optical size, centred, `paper` on `brand`. Squircle at 22.5% corner radius.
- **Wordmark:** Instrument Serif, `-0.025em` tracking. Mark sits left of the word, gap = 30% of the type size.
- **Never animate the bars** — they read as a music equaliser the moment they move.
- **Minimum clear space** on all sides equals one bar width.
- **Reversed:** `paper` mark on `ink` or `brand`. Never place the oxblood mark directly on artwork.

**Voice:** plain, warm, never salesy. Errors explain what happened and how to fix it. Empty states are an invitation, not an apology.

## 9. Design system

**Principle:** the chrome is quiet and light; the *artwork* carries all the colour and mood.

| Token | Value | Role |
|---|---|---|
| `--brand` | `#8C3A46` | Oxblood. Primary actions, active states, brand mark |
| `--brand-tint` | `#D19AA3` | Hover, subtle fills |
| `--paper` | `#FBFAF8` | Background |
| `--ink` | `#15140F` | Type |
| `--ink-soft` | `#57544B` | Secondary type |
| `--ink-faint` | `#9C978B` | Tertiary type, metadata |
| `--line` | `rgba(21,20,15,0.07)` | Hairlines, borders |

**Oxblood is the only brand colour in the chrome.** Everything else is paper and ink, so poster artwork stays the loudest thing on screen. Deliberately distinct from Blasta's orange (`#C8512A`) and Fiú's forest green.

- **No dark theme.** Light only.
- **Display type:** Instrument Serif (regular + italic), used for headings and hero titles.
- **UI type:** Inter, tight negative tracking (`-0.01em` to `-0.02em`).
- **Numerals:** Inter 700, tabular, `-0.055em` tracking. Countdowns are typography, not badges.
- **Ambient colour:** two large blurred colour fields behind the app, derived from the focused title's palette. Transition 1000ms ease-out when the hero changes or the audience filter changes.
- **Glass:** `backdrop-filter: blur(24px) saturate(180%)` — used only on the floating tab bar, the "Remind me" pill, and the play button. Nowhere else.
- **Radii:** 30px hero, 22px rail cards, 20px grid posters, 34px sheets, full for pills.
- **Motion:** `cubic-bezier(.2,.8,.3,1)`. Press = `scale(.972)` at 280ms. Section entrance = staggered rise, 60ms apart. `prefers-reduced-motion` fully respected.
- **Palette extraction:** on add, extract 4 dominant colours from the TMDB poster server-side, store as JSON on `titles.art_palette`. Used for the ambient wash so it never needs client-side canvas work.

---

## 10. Stack

- **Frontend:** React + Vite, PWA (vite-plugin-pwa), service worker for offline shell + push handling
- **Hosting:** Cloudflare Pages
- **API:** Cloudflare Functions
- **DB:** Cloudflare D1
- **Assets:** Cloudflare R2 for cached poster derivatives (optional; TMDB CDN is fine for v1)
- **Cron:** Cloudflare Worker scheduled trigger, 08:00 Europe/Dublin
- **AI:** Claude Haiku
- **Auth:** Cloudflare Access in front of the whole app. Single user — no login UI.

---

## 11. Performance targets

- First contentful paint under 1s on 4G
- Home renders from IndexedDB cache instantly, then revalidates in background
- Poster images: TMDB `w342` for grids, `w780` for hero, lazy loaded below the fold
- Zero layout shift — every artwork container has a fixed aspect ratio
- Full offline: browse and mark-watched work offline, queued and synced when back online

---

## 12. Build order

1. **Shell** — D1 schema, Cloudflare Access, PWA scaffold, design tokens, brand mark as SVG component + app icon set
2. **Search & add** — TMDB search, add sheet, audience tagging, palette extraction
3. **Home** — hero carousel, ambient colour, rails, grid
4. **Title detail & progress** — season accordion, mark watched
5. **Notifications** — VAPID setup, push subscription, cron job, permission flow, notification action buttons + `POST /api/progress` handler in the service worker
6. **Calendar**
7. **Discover** — RT enrichment, taste profile, Haiku suggestions
8. **Offline & polish** — sync queue, motion pass, reduced-motion, accessibility audit

---

## 13. Open questions

1. Confirm OMDb free tier still exposes Rotten Tomatoes scores; if not, switch the quality gate to TMDB `vote_average`.
2. Should abandoned shows be excluded from the taste profile entirely, or count as a negative signal? (Default assumed: excluded.)
3. Notification quiet hours — worth adding, or is 08:00 fine forever?
