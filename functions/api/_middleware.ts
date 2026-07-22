import type { Env } from "../../shared/env";

// Cloudflare Access fronts the whole app, so there is no login UI (PRD §10).
// In production every request carries Cf-Access-Authenticated-User-Email.
// Locally (wrangler pages dev) there is no Access layer, so we fall through.
// This middleware attaches the identity and normalises error/JSON handling.

export type Data = {
  userEmail: string;
};

export const onRequest: PagesFunction<Env, string, Data>[] = [
  async (context) => {
    const email = context.request.headers.get("Cf-Access-Authenticated-User-Email");
    context.data.userEmail = email ?? "dev@localhost";

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
