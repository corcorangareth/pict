import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { registerPwa } from "@/lib/pwa";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker for offline shell + push, with update detection
// (BUILD.md §6.2). Permission is never requested here — only the plumbing.
registerPwa();
