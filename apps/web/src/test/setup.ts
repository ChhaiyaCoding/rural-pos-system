// In-memory IndexedDB for Dexie in Node.
import 'fake-indexeddb/auto'

// src/db/index.ts hands out a no-op stub when `window` is undefined (its SSR
// guard), so pretend to be a browser before any test imports the db.
const g = globalThis as { window?: unknown; localStorage?: Storage }
g.window ??= globalThis

// Minimal localStorage (zustand persist + backup settings use it)
if (!g.localStorage) {
  const store = new Map<string, string>()
  g.localStorage = {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => [...store.keys()][i] ?? null,
    removeItem: (k) => { store.delete(k) },
    setItem: (k, v) => { store.set(k, String(v)) },
  }
}
