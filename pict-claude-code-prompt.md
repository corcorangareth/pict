# Claude Code — Session 1 kickoff prompt

Copy everything below the line into a fresh Claude Code session, with `pict-prd.md` in the repo root.

---

I'm building **Pict**, a personal-use PWA for tracking TV shows and films I'm watching or want to watch, with push notifications when something is released. Single user — me. Not a commercial product.

`pict-prd.md` in the repo root is the full spec. Read it first and treat it as the source of truth.

**Before writing any implementation code, produce a `BUILD.md`** that turns the PRD into concrete, settled decisions. I want every choice baked in before we start, so no design or architecture questions come up mid-build. `BUILD.md` should cover:

1. **Repo structure** — full directory tree, file by file, with a one-line purpose for each
2. **D1 schema** — final DDL, migration file naming, indexes, and the seed/reset scripts
3. **API surface** — every Cloudflare Function route: method, path, request shape, response shape, error cases
4. **TMDB integration** — exact endpoints used, region handling (IE), image size selection per surface, rate-limit and caching strategy
5. **Rotten Tomatoes / critic scores** — resolve open question 1 below before committing to an approach
6. **Push notifications** — VAPID key generation and storage, service worker registration flow, subscription lifecycle, the cron worker's exact daily logic, the de-duplication rules, and the **notification action buttons** (PRD §5) including the `notificationclick` handler, the offline sync-queue path, and the confirmation notification
7. **AI suggestions** — the full Claude Haiku prompt, the JSON schema it must return, validation and fallback behaviour when it returns something malformed
8. **Design tokens** — as CSS custom properties, matching PRD §9 exactly
9. **Component inventory** — every component, its props, and which screen uses it
10. **Offline strategy** — what's cached, what's queued, how the sync queue resolves conflicts
11. **Build order** — the eight phases from PRD §12, broken into session-sized chunks I can tackle one at a time

## Three things to resolve in BUILD.md

1. **Critic scores.** The PRD assumes OMDb's free tier returns Rotten Tomatoes ratings. Verify this is still true. If it isn't, switch the quality gate to TMDB `vote_average` and rename the setting "Critic score" throughout. Tell me which way you went and why.
2. **Abandoned shows.** Should a show I marked abandoned be excluded from the AI taste profile, or count as a negative signal? Pick one, justify it in two sentences, and implement that.
3. **Quiet hours.** The cron fires at 08:00 Europe/Dublin. Decide whether quiet hours are worth building in v1 or are premature. If premature, say so and leave a note in the code where it would go.

## Non-negotiables

- **Light theme only.** No dark mode, not even as an option.
- **Oxblood `#8C3A46` is the only brand colour in the chrome.** Everything else is paper `#FBFAF8` and ink `#15140F`. Poster artwork must stay the loudest thing on screen.
- **The artwork carries the mood.** Palette extraction happens server-side on add and is stored on the title row. The ambient background wash reads from that — never do colour extraction on the client.
- **The countdown is typography, not a badge.** Large, tightly tracked, tabular numerals.
- **The Slats mark never animates.** Static only — it reads as a music equaliser the moment it moves.
- **Motion:** `cubic-bezier(.2,.8,.3,1)` throughout. Press = `scale(.972)` at 280ms. `prefers-reduced-motion` fully respected.
- **Zero layout shift.** Every artwork container has a fixed aspect ratio.
- **Marking watched from a notification must never open a window.** It writes and closes. Android Chrome allows a maximum of two action buttons — never declare more.
- **Accessibility floor:** visible keyboard focus everywhere, semantic landmarks, alt text on posters, minimum 44px touch targets.

## Stack

React + Vite, PWA via `vite-plugin-pwa`, Cloudflare Pages + Functions + D1, Cloudflare Worker scheduled trigger for the daily cron, Claude Haiku for suggestions, Cloudflare Access in front of the whole app so there is no login UI to build.

## What I want back this session

Just `BUILD.md`. No implementation code yet. When it's done, walk me through anything where you made a judgement call I might disagree with, and flag anything in the PRD that turned out to be underspecified or contradictory.
