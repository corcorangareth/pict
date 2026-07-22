# Pict

A personal-use PWA for tracking TV and films, with push notifications when
something drops. Single user. Light theme only. Oxblood chrome, artwork carries
the mood. See [`pict-prd.md`](pict-prd.md) for the spec and [`BUILD.md`](BUILD.md)
for every settled build decision.

## Stack

React + Vite + TypeScript · PWA (`vite-plugin-pwa`, injectManifest) · Cloudflare
Pages + Functions + D1 · a separate scheduled Worker for the daily cron · Claude
Haiku for suggestions · Cloudflare Access in front (no login UI).

## Getting started

```bash
npm install

# 1. Create the D1 database, paste the id into wrangler.toml
wrangler d1 create pict

# 2. Apply migrations locally and seed
npm run db:apply:local
npm run db:seed

# 3. Generate the app icon set
npm run icons

# 4. Run everything (Vite frontend + Functions + local D1)
npm run dev
```

`npm run dev` uses `wrangler pages dev -- vite`, which serves the frontend with
HMR and the `/api/*` Functions against a local D1. Smoke-test the API at
`GET /api/health`.

### Secrets

Copy `.dev.vars.example` to `.dev.vars` for local, and set production secrets
with `wrangler pages secret put NAME`:

- `TMDB_TOKEN` — TMDB v4 read token
- `OMDB_KEY` — OMDb API key (critic scores)
- `ANTHROPIC_API_KEY` — Claude Haiku
- `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` — web push (`npx web-push generate-vapid-keys`)

## Build order

The eight phases are tracked in [`BUILD.md`](BUILD.md) §11. Phase 1 (shell) is
in place: scaffold, tokens, brand mark, PWA config, D1 schema, tab-bar routing.
