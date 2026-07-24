/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

// Custom service worker (injectManifest). Phase 1: offline app shell only.
// Push handling, notificationclick actions, and the offline sync queue land in
// Phase 5/8 (BUILD.md §6.6, §10) — this file is the seam they plug into.

declare const self: ServiceWorkerGlobalScope;

// Injected by vite-plugin-pwa at build time.
precacheAndRoute(self.__WB_MANIFEST);

// Auto-update: a new SW activates as soon as it installs, so fixes (including
// this notification handler) reach the device without a manual "update" tap.
// The page reloads on controllerchange (see registerPwa).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Push: show the notification the cron/test endpoint sent (BUILD.md §6.6) --
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let p: PushPayload;
  try {
    p = event.data.json();
  } catch {
    p = { title: "Pict" };
  }
  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body: p.body,
    tag: p.tag,
    data: p.data ?? {},
    actions: p.actions ?? [],
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };
  event.waitUntil(self.registration.showNotification(p.title ?? "Pict", options));
});

// --- notificationclick: act in place, don't force a window open --------------
self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  const data = (event.notification.data ?? {}) as NotifData;
  event.notification.close();

  if (action === "watched") {
    event.waitUntil(markWatched(data));
  } else if (action === "snooze" || action === "not-yet") {
    // Dismiss. (Snooze re-fires from the next cron run — a v1 simplification.)
  } else {
    event.waitUntil(openApp(data.deepLink ?? "/"));
  }
});

interface PushPayload {
  title?: string;
  body?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

interface NotifData {
  kind?: "tv" | "movie";
  entryId?: number;
  titleId?: number;
  season?: number;
  episode?: number;
  titleName?: string;
  deepLink?: string;
}

// Mark watched straight from the notification — POST and confirm, no window.
// The auth cookie rides along on the same-origin fetch.
async function markWatched(data: NotifData): Promise<void> {
  const body =
    data.kind === "tv"
      ? { entryId: data.entryId, titleId: data.titleId, season: data.season, episode: data.episode, watched: true }
      : { entryId: data.entryId, titleId: data.titleId, watched: true };
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await notify("Marked watched", data.titleName);
      return;
    }
  } catch {
    // fall through to the open-the-app fallback
  }
  // Background write didn't take (auth/offline). Open the app to finish it in the
  // signed-in page context, where the session cookie is always present.
  await openApp(`/?mw=${encodeURIComponent(btoa(JSON.stringify(body)))}`);
}

function notify(title: string, message?: string): Promise<void> {
  return self.registration.showNotification(title, {
    body: message,
    tag: `confirm-${Date.now()}`,
    silent: true,
  });
}

async function openApp(url: string): Promise<void> {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    const wc = client as WindowClient;
    if (wc.focus) {
      await wc.navigate?.(url);
      await wc.focus();
      return;
    }
  }
  await self.clients.openWindow(url);
}

export {};
