// In-memory IndexedDB for Dexie in Node.
import 'fake-indexeddb/auto'

// src/db/index.ts hands out a no-op stub when `window` is undefined (its SSR
// guard), so pretend to be a browser before any test imports the db.
const g = globalThis as { window?: unknown }
g.window ??= globalThis
