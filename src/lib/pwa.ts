import { registerSW } from "virtual:pwa-register";

// The build currently running (git sha + build time), shown in the Me tab.
export const BUILD_ID: string = __BUILD_ID__;

let applyFn: ((reload?: boolean) => Promise<void>) | null = null;

// Register the service worker. It auto-updates (skipWaiting), so a new version
// activates on its own; we reload once when it takes control so the fixed code
// (including the notification handler) is live without any manual step.
export function registerPwa(): void {
  if ("serviceWorker" in navigator) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }
  applyFn = registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      // Long-open PWAs won't navigate, so poll for a new version hourly.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });
}

// Activate the waiting service worker and reload onto the new version.
export function applyUpdate(): void {
  void applyFn?.(true);
}
