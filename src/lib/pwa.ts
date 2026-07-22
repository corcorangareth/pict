import { registerSW } from "virtual:pwa-register";

// The build currently running (git sha + build time), shown in the Me tab.
export const BUILD_ID: string = __BUILD_ID__;

let applyFn: ((reload?: boolean) => Promise<void>) | null = null;

// Register the service worker and wire update detection. When a new version is
// waiting, dispatch a window event the UI listens for to show the update banner.
export function registerPwa(): void {
  applyFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event("pwa:need-refresh"));
    },
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
