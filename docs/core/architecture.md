# Architecture

## System Overview

Multi-tenant SaaS with an offline-first mobile client. The mobile app is the primary product — the backend exists to sync, back up, and enable multi-device access, not to serve real-time requests.

```
┌──────────────────────────────────────────────────────┐
│                   SaaS Backend (API)                  │
│  - Tenant & subscription management                   │
│  - Sync endpoint (receives queued writes from client) │
│  - Auth (JWT issue & refresh)                         │
│  - Push notifications                                 │
└────────────────────────┬─────────────────────────────┘
                         │ HTTPS (sync only, never blocking)
┌────────────────────────▼─────────────────────────────┐
│              Mobile App — Expo / React Native         │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  SQLite DB  │  │ Sync Engine  │  │ Zustand     │  │
│  │ (local SoT) │◄─┤ (background) ├─►│ Stores      │  │
│  └─────────────┘  └──────────────┘  └──────┬──────┘  │
│                                            │          │
│  ┌─────────────────────────────────────────▼──────┐  │
│  │         Service Layer (feature services)        │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │         UI — Expo Router screens + components   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Mobile client | Expo (React Native) | Cross-platform iOS + Android, OTA updates, camera/barcode access |
| Navigation | Expo Router (file-based) | Familiar, deep-link ready for multi-tenant auth flows |
| Local DB | expo-sqlite + Drizzle ORM | SQLite runs fully offline; Drizzle gives typed queries |
| State | Zustand | Lightweight, no boilerplate, composable slices |
| Backend | Hono on Bun | Fast, lightweight, TypeScript-native |
| Backend DB | PostgreSQL + Drizzle | Same ORM as client for shared schema types |
| Auth | JWT (access + refresh) via backend | Simple, stateless, works offline between refreshes |
| Sync | REST-based queue flush (not WebSocket) | Simpler to reason about; avoids persistent connection on mobile |
| i18n | i18next + react-i18next | Mature, supports Khmer Unicode, JSON translation files |
| Barcode | expo-camera + vision-camera-code-scanner | Camera-based; no hardware dependency |

---

## Folder Structure

```
rural-pos-system/
├── apps/
│   ├── mobile/                  # Expo React Native app
│   │   ├── app/                 # Expo Router file-based screens
│   │   │   ├── (auth)/          # Login, register, onboarding
│   │   │   ├── (app)/           # Protected app screens
│   │   │   │   ├── index.tsx    # Home / dashboard
│   │   │   │   ├── sales/
│   │   │   │   ├── debt/
│   │   │   │   ├── inventory/
│   │   │   │   ├── reports/
│   │   │   │   └── settings/
│   │   │   └── _layout.tsx
│   │   ├── src/
│   │   │   ├── components/      # Reusable UI components
│   │   │   │   ├── ui/          # Atoms: Button, Input, Badge, Modal
│   │   │   │   └── shared/      # Composed: ProductCard, DebtRow, ReceiptSheet
│   │   │   ├── features/        # Feature modules (see Feature Module Rules)
│   │   │   │   ├── sales/
│   │   │   │   ├── debt/
│   │   │   │   ├── inventory/
│   │   │   │   ├── barcode/
│   │   │   │   └── reports/
│   │   │   ├── store/           # Zustand stores (one per domain)
│   │   │   ├── services/        # Service layer (one per domain)
│   │   │   ├── db/              # SQLite schema, migrations, query helpers
│   │   │   ├── sync/            # Sync engine, queue, conflict resolution
│   │   │   ├── i18n/            # Translation files (km.json default)
│   │   │   ├── lib/             # Pure utilities (money, dates, uuid, validation)
│   │   │   └── types/           # Shared TypeScript types and branded types
│   │   └── assets/
│   └── api/                     # Hono backend
│       ├── src/
│       │   ├── routes/          # One file per feature domain
│       │   ├── db/              # Drizzle schema + migrations
│       │   ├── middleware/      # Auth, tenant isolation, rate limiting
│       │   └── lib/             # Shared utilities
│       └── drizzle/             # Migration files
├── packages/
│   └── shared/                  # Types shared between mobile and API
│       └── src/
│           ├── types/           # Shared domain types (Product, Sale, Debt, etc.)
│           └── constants/       # Shared enums and constants
└── docs/
    ├── core/
    └── temp/
```

### Folder Rules
- Screens live in `app/` (Expo Router). They import from `src/` — never the reverse.
- Feature logic lives in `src/features/{feature}/`. A feature folder owns its own hooks, constants, and feature-specific components.
- `src/lib/` is for pure functions only — no React, no Zustand, no DB access.
- `src/types/` holds TypeScript type definitions only — no runtime logic.
- Cross-feature imports are forbidden: `features/sales` must not import from `features/debt`. Shared types go in `src/types/` or `packages/shared`.

---

## Feature Module Structure

Each feature in `src/features/{feature}/` follows this internal structure:

```
features/sales/
├── components/       # Sales-specific UI (CartItem, PaymentModal, ReceiptSheet)
├── hooks/            # useCart, useCheckout — thin wrappers around store + service
├── sales.service.ts  # Business logic (see Service Layer Rules)
├── sales.schema.ts   # Zod schemas for validation
└── index.ts          # Public exports from this feature
```

---

## Service Layer Rules

Services are the only layer that reads from or writes to the local DB or calls the API. Everything else talks to services.

### What a service does
1. Receives a validated input from a hook or screen.
2. Writes to local SQLite.
3. Pushes a record to the sync queue.
4. Returns the result (no throwing for expected business failures — return a Result type).

### What a service does NOT do
- Access Zustand store — services are Zustand-agnostic.
- Make network calls directly — that is the sync engine's job.
- Contain UI logic or React imports.
- Throw for expected failures (product not found, insufficient stock) — return typed errors.

### Service function signature pattern
```ts
// Return a discriminated Result — never throw for business failures
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

async function createSale(input: CreateSaleInput): Promise<Result<Sale>> { ... }
```

### Calling pattern from a hook
```ts
// In a feature hook — never in a screen component
const result = await salesService.createSale(input);
if (!result.ok) {
  saleStore.setError(result.error);
  return;
}
saleStore.addSale(result.data);
```

---

## Zustand Rules

### One store per domain
```
store/
├── sale.store.ts
├── debt.store.ts
├── inventory.store.ts
├── customer.store.ts
├── sync.store.ts        # sync status only
└── auth.store.ts
```

### What belongs in a Zustand store
- UI state: loading flags, selected item ID, active modal, current cart contents.
- Cached read data: the current list of products for the active session.
- Transient state: items in the current sale cart.

### What does NOT belong in a Zustand store
- The authoritative business data — that lives in SQLite.
- Anything that must survive an app restart — use SQLite, not Zustand persist.
- Derived values — compute them with selectors or `useMemo`, not stored state.

### Store structure pattern
```ts
// Each store is a flat slice — avoid nesting
interface SaleStore {
  // State
  cart: CartItem[];
  isCheckingOut: boolean;
  error: AppError | null;

  // Actions (call services, then update state)
  addToCart: (product: Product, qty: number) => void;
  removeFromCart: (productId: UUID) => void;
  clearCart: () => void;
  setError: (error: AppError | null) => void;
}
```

### Rules
- Store actions are synchronous state mutations only. Async work (DB writes, service calls) happens in hooks, not in store actions.
- Never call one store's action from inside another store.
- No derived state stored in the store — compute it in the component or hook.
- Zustand `persist` middleware is allowed only for: auth tokens, user preferences, and UI settings. Never for business data.

---

## Offline Architecture

### Principle: Local SQLite is the source of truth on the device.

The cloud is a sync target, not the source. The app never waits for the network.

### Write path (every mutation)
```
User action
    │
    ▼
Service layer
    │
    ├─► 1. Write to local SQLite (immediately)
    │
    ├─► 2. Insert record into sync_queue table
    │         { id, table_name, record_id, operation, payload, created_at, tenant_id }
    │
    └─► 3. Return result to hook → hook updates Zustand store → UI updates
```

### Sync engine
- Runs as a background task triggered by: app foreground event, network-online event, and a 30-second polling interval while online.
- Reads all unsynced rows from `sync_queue` ordered by `created_at` ASC.
- Posts each batch to the backend `/sync` endpoint.
- On success: marks queue rows as synced (soft delete with `synced_at`).
- On failure: retries with exponential backoff. Logs error. Never blocks the user.

### Conflict resolution
| Record type | Strategy |
|---|---|
| Product, Customer (mutable) | Last-write-wins by `updated_at` server timestamp |
| Sale, DebtTransaction (financial) | Append-only — never updated or overwritten after creation |
| SyncQueue rows | Processed in creation order; duplicates detected by idempotency key |

### Offline SQLite schema rules
- Every table has: `id UUID PRIMARY KEY`, `tenant_id UUID NOT NULL`, `created_at TEXT`, `updated_at TEXT`, `deleted_at TEXT` (soft delete), `synced_at TEXT`.
- Financial tables (sales, debt_transactions, payments) additionally have `is_void BOOLEAN` — never hard delete, never update amounts.
- All UUIDs generated client-side (v4) so records can be created without a server round-trip.

### Sync queue table
```sql
CREATE TABLE sync_queue (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  table_name   TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  operation    TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  payload      TEXT NOT NULL,  -- JSON
  created_at   TEXT NOT NULL,
  synced_at    TEXT,
  error        TEXT
);
```

---

## Reusable Component Rules

### Component hierarchy
```
components/ui/          ← Atoms. Zero business logic. Fully generic.
    Button.tsx
    Input.tsx
    Badge.tsx
    NumericPad.tsx      ← Custom numpad for price/qty entry (no full keyboard)
    BottomSheet.tsx
    EmptyState.tsx

components/shared/      ← Composed domain-aware components.
    ProductCard.tsx     ← Knows what a Product looks like, but receives it as a prop
    DebtRow.tsx
    ReceiptSheet.tsx
    SyncStatusBar.tsx

features/{x}/components/ ← Feature-specific components. Not reused across features.
```

### Rules for all components
- No direct DB access inside a component — ever.
- No direct Zustand store writes inside a component — call a hook action.
- No hardcoded Khmer or English strings in JSX — all text via `useTranslation()`.
- All touch targets: minimum 48×48px, enforced via the `Button` atom.
- Primary actions always in the bottom 60% of the screen (thumb-reachable zone).
- Components receive data via props; side effects go in hooks.

### UI atom contract (example)
```ts
// components/ui/Button.tsx
interface ButtonProps {
  label: string;           // Always a translated string — never raw text
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}
```

---

## TypeScript Rules

### Strict mode — always on
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### No `any` — ever
- Use `unknown` + type guards at system boundaries (API responses, SQLite rows).
- Use Zod to parse external data and derive types from schemas.

### Branded types for domain primitives
```ts
// src/types/branded.ts
type Brand<T, B extends string> = T & { readonly __brand: B };

type UUID       = Brand<string, 'UUID'>;
type KHR        = Brand<number, 'KHR'>;   // Riel — always integer
type TenantId   = Brand<UUID, 'TenantId'>;
type ProductId  = Brand<UUID, 'ProductId'>;
type CustomerId = Brand<UUID, 'CustomerId'>;

// Prevent mixing raw numbers with monetary values:
// const price: KHR = 5000;           ✗ — type error
// const price: KHR = 5000 as KHR;   ✓ — explicit intent
```

### Discriminated unions for status and results
```ts
// AppError — never throw strings or generic Error for business failures
type AppError =
  | { code: 'PRODUCT_NOT_FOUND'; productId: ProductId }
  | { code: 'INSUFFICIENT_STOCK'; available: number; requested: number }
  | { code: 'CUSTOMER_NOT_FOUND'; customerId: CustomerId }
  | { code: 'SYNC_FAILED'; reason: string };

// Result type — returned by all service functions
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };
```

### Explicit return types on services and hooks
```ts
// ✓ explicit return type
async function createSale(input: CreateSaleInput): Promise<Result<Sale>> { ... }
function useCart(): { cart: CartItem[]; addItem: (p: Product) => void; total: KHR } { ... }

// ✗ inferred return — allowed only for trivial helpers in lib/
```

### Zod for all external data
```ts
// Parse API responses and SQLite rows at the boundary — never trust raw data
const SaleSchema = z.object({
  id: z.string().uuid().transform(v => v as UUID),
  total: z.number().int().nonnegative().transform(v => v as KHR),
  ...
});
type Sale = z.infer<typeof SaleSchema>;
```

### Import order (enforced by ESLint)
1. React / React Native
2. Expo / third-party libraries
3. `packages/shared`
4. `src/types`, `src/lib`
5. `src/db`, `src/services`, `src/store`
6. `src/components`
7. Feature-local imports (`./components`, `./hooks`)

---

## Multi-Tenancy Rules

- `tenant_id` is on every table row — set at write time from the auth store, never derived from the current user mid-query.
- Every DB query helper must accept `tenantId` as an explicit parameter — never read it from a global.
- The sync engine sends `tenant_id` in every request header for server-side verification.
- Backend middleware rejects any request where the JWT tenant claim does not match the payload `tenant_id`.

---

## What Not to Do

- Do not fetch from the API in a component or screen — use a service via a hook.
- Do not write to SQLite in a component or screen — use a service.
- Do not store business data in Zustand persist — it will go stale and diverge from SQLite.
- Do not use `any` — if the type is genuinely unknown, use `unknown` and narrow it.
- Do not create a shared/global SQL query that joins across tenant rows — all queries filter by `tenant_id` first.
- Do not make sync blocking — it always runs in the background.
- Do not hard-delete financial records — use `is_void` and `deleted_at` instead.
