#!/usr/bin/env bash
# Drop and rebuild the LOCAL D1 database, then seed it. Never touches remote.
set -euo pipefail

echo "Resetting local D1 (pict)…"
# Wipe the local miniflare D1 state.
rm -rf .wrangler/state/v3/d1

wrangler d1 migrations apply pict --local
wrangler d1 execute pict --local --file=scripts/seed.sql

echo "Done. Local D1 reset and seeded."
