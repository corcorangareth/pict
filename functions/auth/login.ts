import type { Env } from "../../shared/env";
import { makeToken, sessionCookie, safeEqual } from "../../shared/auth";

// POST /auth/login { password } — set the session cookie if the password matches.
// Public (not behind the API gate) so it can be reached when logged out.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { password?: string };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const password = body.password ?? "";
  const expected = context.env.APP_PASSWORD ?? "";
  // Reject if no password is configured, or on mismatch (constant-time).
  if (!expected || password.length !== expected.length || !safeEqual(password, expected)) {
    return json({ error: "wrong_password" }, 401);
  }

  const token = await makeToken(context.env.AUTH_SECRET);
  const secure = new URL(context.request.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "Set-Cookie": sessionCookie(token, secure) },
  });
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
