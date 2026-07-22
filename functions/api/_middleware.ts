import type { Env } from "../../shared/env";
import { COOKIE, readCookie, verifyToken } from "../../shared/auth";

// The API is gated by the app password (see functions/auth/login.ts). Every
// /api request must carry a valid signed session cookie, or it gets 401 — the
// client then shows the unlock screen. Also normalises error/JSON handling.

export type Data = {
  userEmail: string;
};

export const onRequest: PagesFunction<Env, string, Data>[] = [
  async (context) => {
    const token = readCookie(context.request, COOKIE);
    const authed = await verifyToken(context.env.AUTH_SECRET, token);
    if (!authed) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Locked" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    context.data.userEmail = "owner";

    try {
      return await context.next();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      return new Response(JSON.stringify({ error: { code: "server", message } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
];
