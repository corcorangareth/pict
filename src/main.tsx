import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker for offline shell + push (BUILD.md §6.2).
// Permission is never requested here — only offline/push plumbing is enabled.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { type: "module" }).catch((err) => {
      console.error("SW registration failed", err);
    });
  });
}
