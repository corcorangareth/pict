import { useCallback, useEffect, useState } from "react";
import { api, type LibraryItem } from "@/lib/api";
import { readLibraryCache, writeLibraryCache } from "@/lib/idb";

// Cache-first: hand back IDB immediately, then revalidate from the network.
// `version` lets callers force a refetch (e.g. after an add).
export function useLibrary(version = 0) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revalidate = useCallback(async () => {
    try {
      const fresh = await api.getLibrary();
      setItems(fresh);
      setError(null);
      void writeLibraryCache(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load library");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    // 1. paint from cache
    readLibraryCache().then((cached) => {
      if (alive && cached && items === null) setItems(cached);
    });
    // 2. revalidate
    void revalidate();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, revalidate]);

  // Re-fetch whenever the app is brought back to the foreground (e.g. reopening
  // the installed PWA), so the library is never showing stale/empty cache.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [revalidate]);

  return { items, error, revalidate };
}
