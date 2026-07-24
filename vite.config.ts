import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { execSync } from "node:child_process";

// A per-build identifier (git sha + build time) surfaced in the app so it's
// obvious which version is running and when it last updated.
function buildId(): string {
  let sha = "dev";
  try {
    sha = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    /* not a git checkout */
  }
  const date = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `${sha} · ${date} UTC`;
}

// Pict — light-theme PWA. Service worker built via injectManifest so we own
// the push + notificationclick logic in src/sw.ts (see BUILD.md §6, §10).
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: null, // we register manually in main.tsx
      manifest: false, // provided by public/manifest.webmanifest
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
