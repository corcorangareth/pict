import type { Env } from "../../shared/env";
import { sessionCookie } from "../../shared/auth";

// POST /auth/logout — clear the session cookie.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const secure = new URL(context.request.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "Set-Cookie": sessionCookie("", secure, 0) },
  });
};
