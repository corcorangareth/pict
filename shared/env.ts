import type { D1Database } from "@cloudflare/workers-types";

// Bindings available to Cloudflare Pages Functions and the cron Worker.
export interface Env {
  DB: D1Database;
  // vars
  TMDB_REGION: string;
  VAPID_SUBJECT: string;
  VAPID_PUBLIC_KEY: string;
  // secrets (wrangler pages secret put ...)
  TMDB_TOKEN: string;
  OMDB_KEY: string;
  ANTHROPIC_API_KEY: string;
  VAPID_PRIVATE_KEY: string;
  APP_PASSWORD: string; // the single password that unlocks the app
  AUTH_SECRET: string; // HMAC key for signing the session cookie
}
