/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

// Custom service worker (injectManifest). Phase 1: offline app shell only.
// Push handling, notificationclick actions, and the offline sync queue land in
// Phase 5/8 (BUILD.md §6.6, §10) — this file is the seam they plug into.

declare const self: ServiceWorkerGlobalScope;

// Injected by vite-plugin-pwa at build time.
precacheAndRoute(self.__WB_MANIFEST);

// Don't auto-skip-waiting: a freshly installed SW waits so the app can show an
// "Update available" banner. It activates only when the user taps update, which
// posts this message (from registerSW's updateSW(true)).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Phase 5 seam: push + notificationclick ---------------------------------
// self.addEventListener("push", (event) => { ... });
// self.addEventListener("notificationclick", (event) => {
//   // branch on event.action: "watched" | "snooze" | "not-yet" | default
// });

export {};
