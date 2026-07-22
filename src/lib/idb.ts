import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LibraryItem } from "@/lib/api";

// IndexedDB cache so Home renders instantly, then revalidates (PRD §11).
// The sync queue store lands in Phase 8; declared here so the schema is stable.
interface PictDB extends DBSchema {
  cache: { key: string; value: unknown };
  "sync-queue": { key: number; value: { url: string; method: string; body: string; ts: string }; autoIncrement: true };
}

let dbp: Promise<IDBPDatabase<PictDB>> | null = null;

function db(): Promise<IDBPDatabase<PictDB>> {
  if (!dbp) {
    dbp = openDB<PictDB>("pict", 1, {
      upgrade(d) {
        d.createObjectStore("cache");
        d.createObjectStore("sync-queue", { autoIncrement: true });
      },
    });
  }
  return dbp;
}

const LIBRARY_KEY = "library";

export async function readLibraryCache(): Promise<LibraryItem[] | null> {
  try {
    const d = await db();
    return ((await d.get("cache", LIBRARY_KEY)) as LibraryItem[]) ?? null;
  } catch {
    return null;
  }
}

export async function writeLibraryCache(library: LibraryItem[]): Promise<void> {
  try {
    const d = await db();
    await d.put("cache", library, LIBRARY_KEY);
  } catch {
    /* cache is best-effort */
  }
}
