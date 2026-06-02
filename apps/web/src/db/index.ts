import { PosDatabase } from './schema'

// Singleton — one Dexie instance for the entire app lifetime.
// Guard against SSR: IndexedDB is browser-only; during Next.js prerendering
// this module runs in Node.js where `indexedDB` does not exist.
// All actual DB calls happen inside React hooks (useLiveQuery / useEffect)
// which only execute on the client, so the stub is never actually called.
const createDb = (): PosDatabase => {
  if (typeof window === 'undefined') {
    // Return a no-op stub so the module loads without crashing on the server.
    return new Proxy({} as PosDatabase, {
      get: () => () => Promise.resolve(undefined),
    })
  }
  return new PosDatabase()
}

export const db = createDb()
