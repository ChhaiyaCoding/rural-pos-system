# Current Task — Setup Project Foundation

## Status
✅ Foundation complete — ready to install dependencies and run

**Started:** 2026-05-29
**Last updated:** 2026-05-29
**Owner:** Claude + developer

---

## Task Goal

Bootstrap the full monorepo project structure for the Khmer SaaS POS system using Next.js as the client (PWA), Supabase as backend and sync layer, Zustand for state, Tailwind for UI, and TypeScript throughout.

After this task, the project must be:
- Runnable locally (`pnpm dev`)
- Deployable to Vercel (frontend) + Supabase (backend/db)
- PWA-installable on iPhone and Android
- Typed end-to-end (DB schema → API → client)
- i18n-ready with Khmer as default language

---

## Tech Stack Decisions

These are final for this task. Do not re-open without updating `architecture.md`.

| Layer | Decision | Reason |
|---|---|---|
| Client framework | **Next.js 15 (App Router)** | PWA support, server components, works on iOS + Android via browser install |
| PWA | **next-pwa** (with Workbox) | Service worker + offline cache out of the box |
| Language | **TypeScript 5 (strict)** | Required for all files — no `.js` files in `src/` |
| Styling | **Tailwind CSS v4** | Utility-first, mobile-first by default, small bundle |
| State | **Zustand v5** | Per-domain slices, no boilerplate |
| Backend / DB | **Supabase** | Postgres + Auth + Realtime + Storage — hosted, no server to manage |
| ORM / types | **Supabase generated types** (`supabase gen types typescript`) | Single source of truth for DB types |
| Offline DB | **IndexedDB via Dexie.js** | Structured local storage for offline-first; syncs to Supabase when online |
| i18n | **next-intl** | App Router–native, Khmer (`km`) as default locale |
| Forms | **react-hook-form + Zod** | Typed validation, minimal re-renders |
| Icons | **lucide-react** | Consistent, tree-shakeable |
| Barcode | **@zxing/browser** | Camera-based barcode scanning, no hardware required |

**Note:** This replaces the Expo/React Native stack described in `architecture.md`. Update that file after this task to reflect Next.js PWA as the client platform decision.

---

## Monorepo Structure to Create

```
rural-pos-system/
├── apps/
│   └── web/                        # Next.js PWA — primary POS client
├── packages/
│   └── shared/                     # Shared types between web + any future native app
├── supabase/                       # Supabase local config, migrations, seed
│   ├── migrations/
│   └── seed.sql
├── docs/
│   ├── core/
│   └── temp/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
└── turbo.json                      # Turborepo build pipeline
```

---

## Setup Checklist

Work through these in order. Mark each `[x]` when done. Do not skip ahead.

### Phase 1 — Monorepo Scaffold
- [ ] 1.1 Init `pnpm-workspace.yaml` at root
- [ ] 1.2 Init root `package.json` (private, workspaces)
- [ ] 1.3 Install and configure **Turborepo** (`turbo.json`)
- [ ] 1.4 Create `packages/shared/` with `tsconfig.json` and placeholder types
- [ ] 1.5 Create `supabase/` folder and init with `supabase init`

### Phase 2 — Next.js App (`apps/web`)
- [ ] 2.1 Scaffold Next.js 15 with App Router and TypeScript
  ```bash
  pnpm create next-app@latest apps/web \
    --typescript --tailwind --app --no-src-dir --import-alias "@/*"
  ```
- [ ] 2.2 Move to `src/` directory structure manually (preferred over create-next-app default)
- [ ] 2.3 Configure `tsconfig.json` — strict mode, path aliases
- [ ] 2.4 Configure `next.config.ts` — PWA plugin, image domains, locale
- [ ] 2.5 Add `.env.local` template (never commit real values)

### Phase 3 — PWA Configuration
- [ ] 3.1 Install `next-pwa`
- [ ] 3.2 Create `public/manifest.json` — Khmer app name, icons, theme color
- [ ] 3.3 Configure service worker via `next-pwa` in `next.config.ts`
- [ ] 3.4 Add PWA meta tags to root `layout.tsx`
- [ ] 3.5 Create app icons: 192×192, 512×512 (use placeholder until design is ready)
- [ ] 3.6 Test: install on Android Chrome and iOS Safari as PWA

### Phase 4 — Tailwind Setup
- [ ] 4.1 Confirm Tailwind v4 installed (ships with Next.js scaffold)
- [ ] 4.2 Configure `tailwind.config.ts`:
  - Extend font family with Khmer-compatible font (Noto Sans Khmer)
  - Define brand color tokens (`primary`, `danger`, `success`, `surface`)
  - Set `screens` breakpoints: `sm: 390px` (iPhone 14), `md: 768px`, `lg: 1024px`
- [ ] 4.3 Add Noto Sans Khmer to `layout.tsx` via Google Fonts (next/font)
- [ ] 4.4 Set base body styles in `globals.css`: font, background, touch-action

### Phase 5 — Supabase Setup
- [ ] 5.1 Create Supabase project at supabase.com (name: `rural-pos-{env}`)
- [ ] 5.2 Install Supabase CLI and link local project (`supabase link`)
- [ ] 5.3 Install `@supabase/supabase-js` and `@supabase/ssr` in `apps/web`
- [ ] 5.4 Create `src/lib/supabase/client.ts` — browser client
- [ ] 5.5 Create `src/lib/supabase/server.ts` — server component client (cookie-based)
- [ ] 5.6 Create `src/lib/supabase/middleware.ts` — session refresh on every request
- [ ] 5.7 Add `middleware.ts` at app root to run Supabase session middleware
- [ ] 5.8 Generate TypeScript types: `supabase gen types typescript --local > src/types/supabase.ts`

### Phase 6 — Initial DB Schema (Supabase Migration)
Create `supabase/migrations/001_initial_schema.sql` with:
- [ ] 6.1 `tenants` table (id, name, subscription_tier, created_at)
- [ ] 6.2 `profiles` table (id → auth.users, tenant_id, role, name_km, created_at)
- [ ] 6.3 `products` table (id, tenant_id, name_km, barcode, unit, cost_price, sell_price, stock_qty, low_stock_threshold, deleted_at)
- [ ] 6.4 `customers` table (id, tenant_id, name_km, phone, debt_balance, created_at, deleted_at)
- [ ] 6.5 `sales` table (id, tenant_id, cashier_id, total_amount, payment_type, created_at, is_void)
- [ ] 6.6 `sale_items` table (id, sale_id, tenant_id, product_id, qty, unit_price, subtotal)
- [ ] 6.7 `debt_transactions` table (id, tenant_id, customer_id, sale_id, amount, type [charge|payment], note, created_at, is_void)
- [ ] 6.8 Enable Row Level Security (RLS) on all tables — filter by `tenant_id`
- [ ] 6.9 Run migration: `supabase db push`
- [ ] 6.10 Regenerate TypeScript types after migration

### Phase 7 — Offline Layer (Dexie / IndexedDB)
- [ ] 7.1 Install `dexie` and `dexie-react-hooks`
- [ ] 7.2 Create `src/db/schema.ts` — Dexie database class, mirroring Supabase tables
- [ ] 7.3 Create `src/db/index.ts` — export singleton `db` instance
- [ ] 7.4 Create `src/sync/queue.ts` — sync queue table in Dexie (`sync_queue`)
- [ ] 7.5 Create `src/sync/engine.ts` — background sync runner (flush queue to Supabase)
- [ ] 7.6 Wire sync engine to network online event in a root layout client component

### Phase 8 — Zustand Stores
Create empty store shells — implementation comes in feature tasks:
- [ ] 8.1 `src/store/auth.store.ts` — user, tenantId, session
- [ ] 8.2 `src/store/sale.store.ts` — current cart, checkout state
- [ ] 8.3 `src/store/inventory.store.ts` — product list cache
- [ ] 8.4 `src/store/debt.store.ts` — customer debt cache
- [ ] 8.5 `src/store/sync.store.ts` — sync status (online, syncing, lastSyncedAt)
- [ ] 8.6 `src/store/ui.store.ts` — global UI state (active modal, bottom sheet)

### Phase 9 — i18n Setup (next-intl)
- [ ] 9.1 Install `next-intl`
- [ ] 9.2 Create `src/i18n/km.json` — Khmer translations (seed with key labels for nav and common actions)
- [ ] 9.3 Configure `i18n.ts` at root and `src/i18n/request.ts`
- [ ] 9.4 Wrap root layout with `NextIntlClientProvider`
- [ ] 9.5 Set default locale to `km` (no locale prefix in URL — single language for now)
- [ ] 9.6 Verify: all hardcoded Khmer strings in layout render correctly

### Phase 10 — App Shell
- [ ] 10.1 Create root `layout.tsx` — font, PWA meta, providers (Zustand, i18n, Supabase)
- [ ] 10.2 Create `(auth)/` route group — login page shell (Khmer UI, no logic yet)
- [ ] 10.3 Create `(app)/` route group with layout — bottom navigation bar
- [ ] 10.4 Bottom nav tabs: លក់ (Sales), ស្តុក (Inventory), បំណុល (Debt), របាយការណ៍ (Reports), ⚙️ (Settings)
- [ ] 10.5 Create placeholder screen for each tab (Khmer heading, empty state)
- [ ] 10.6 Confirm mobile layout renders correctly at 390px width
- [ ] 10.7 Confirm bottom nav is thumb-reachable (fixed bottom, 64px tall, 48px touch targets)

### Phase 11 — Dev Tooling
- [ ] 11.1 Configure ESLint with rules: no-any, import/order, react-hooks
- [ ] 11.2 Configure Prettier (single quotes, trailing comma, 100 char width)
- [ ] 11.3 Add `lint-staged` + `husky` pre-commit hook (lint + type-check)
- [ ] 11.4 Add scripts to root `package.json`: `dev`, `build`, `lint`, `typecheck`, `db:types`
- [ ] 11.5 Add `.env.example` documenting all required env vars

---

## Environment Variables Required

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side only, never expose to client
```

---

## Definition of Done

This task is complete when ALL of the following are true:

- [ ] `pnpm dev` starts without errors
- [ ] App opens at `localhost:3000` and shows Khmer text in the bottom nav
- [ ] PWA manifest is valid (check Chrome DevTools → Application → Manifest)
- [ ] Service worker is registered (Application → Service Workers)
- [ ] App can be installed on Chrome Android and Safari iOS
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes with zero warnings
- [ ] Supabase local DB is running with initial schema applied
- [ ] `src/types/supabase.ts` is generated and reflects all 7 tables
- [ ] Dexie local DB initializes without error in browser console
- [ ] All 6 Zustand stores are created (empty shells, no errors)
- [ ] i18n is wired — Khmer text renders from `km.json`, not hardcoded in JSX
- [ ] Layout is mobile-first at 390px — no horizontal scroll, bottom nav visible

---

## Decisions to Make During This Task

If these come up, resolve them here rather than guessing:

| Decision | Options | Default if not decided |
|---|---|---|
| Monorepo tooling | Turborepo vs. plain pnpm workspaces | Use Turborepo |
| PWA cache strategy | Network-first vs. cache-first | Cache-first for static assets, network-first for API |
| Offline sync trigger | On network reconnect only vs. polling | Both (reconnect event + 30s poll) |
| Auth flow | Supabase Magic Link vs. Email+Password | Email+Password (rural users may not have reliable email — consider phone OTP later) |
| RLS policy | Per-tenant by `tenant_id` column | Enforce on all tables, no exceptions |

---

## Blockers
None at start. Log any blockers here as they arise.

---

## Session Log

| Date | What was done |
|---|---|
| 2026-05-29 | Task created. Project docs initialized. Tech stack decided. |
| 2026-05-29 | Full foundation scaffolded: monorepo, Next.js 15, Tailwind v4, Zustand (6 stores), Dexie offline DB, sync engine, 4 service shells, 5 UI components, km.json i18n, Supabase migration SQL, PWA manifest. |

---

## Session Log (continued)

| Date | What was done |
|---|---|
| 2026-05-30 | MVP POS UI built: mock-products.ts (17 items), ProductCard, CartLineItem, CartPanel, POSScreen. Layout updated for tablet. formatKHR fixed to Arabic numerals. |

---

---

## Session Log (continued)

| Date | What was done |
|---|---|
| 2026-06-02 | App verified across all 5 tabs (mobile 390px + tablet 768px). Fixed hydration error: sync.store.ts now initializes isOnline:true always; NetworkWatcher in Providers.tsx reads navigator.onLine on mount + subscribes to online/offline events. Fixed Khmer-first violations: search placeholders "English" → "EN", Settings section "RECEIPT" → "វិក្យបត្រ", removed English-only "Sign out" sub-label. |
| 2026-06-06 | Bug-hunt pass (mobile 375px). **Fixed customer-seed duplication:** `customerService.seedIfEmpty` used random-UUID `create()` in a loop → React StrictMode (dev) double-invoked the seed effect, both saw count 0, producing 10 customers (5×2). Rewrote to fixed IDs (`cust-demo-1..5`) + `bulkPut`, matching the idempotent product seed. Verified: clean reseed now yields 5 unique. **Fixed Khmer spelling inconsistency:** "stock" was spelled two ways — `ស្តុក` (ត, standard) vs `ស្ដុក` (ដ). Normalized all 11 `ស្ដុក` → `ស្តុក` across inventory/page, settings/page, RestockSheet, ProductFormSheet. Verified consistent on Inventory + Settings. Typecheck passes. **Fixed change-due visibility:** in cash checkout the "ប្រាក់អាប់" row sat at the bottom of the scrollable body (below the fold) — cashier had to scroll to see change owed. Moved it out of the scroll area into the sticky footer, directly above the confirm button (only for `isCash`). Now always visible regardless of scroll. Verified both states: normal (13,500 ៛ shown) and not-enough (0 ៛ + disabled button + "ប្រាក់ទទួលតិចជាងសរុប" warning, no overflow). [CheckoutSheet.tsx](apps/web/src/features/sales/components/CheckoutSheet.tsx) **Noted, not changed (need founder call):** login screen + accent color is blue, conflicting with locked "warm" design direction. |
| 2026-06-06 | **Fixed fly-to-cart target inconsistency.** Bubble flew to the wrong place on 2nd tap: mobile 1st tap→fallback, 2nd→bar; desktop 1st→bottom-left fallback, 2nd→(0,0)/logo. Root cause: target was `cartBtnRef` (mobile bar) which (a) isn't rendered on the 1st tap because `addToCart` runs before `onFly` so `count` is still 0, and (b) is `md:hidden` on desktop → `getBoundingClientRect()` returns a zero rect → (0,0) = logo. Fix in [POSScreen.tsx](apps/web/src/features/sales/components/POSScreen.tsx) `handleFly`: defer target read by one `requestAnimationFrame` (so the just-rendered cart bar is in the DOM) and choose whichever target is actually visible (rect width > 0) — mobile bar vs new `cartPanelRef` on the desktop `<aside>` — with a bottom-center fallback. Verified numerically: mobile both taps → cart-bar center (188,693); desktop(1280) both taps → sidebar (1104,72), no longer logo. |
| 2026-06-06 | **Sales checkout cash now accepts $ as well as ៛** ([CheckoutSheet.tsx](apps/web/src/features/sales/components/CheckoutSheet.tsx)): mirrored the debt-repayment UX — added a ៛/$ toggle on the tendered field; `tendered` (៛) is now derived from `tenderInput` string × currency (rate via store `exchangeRate`), staying the source of truth for change/enough. Replaced the always-on dual chip rows with one currency-aware set (riel denominations or USD notes) + live equivalent line. Verified: $5 on an 11,500 ៛ sale → change 8,500 ៛ / $2.13, sale confirms. Pushed to `main`. |
| 2026-06-06 | **Debt repayment now accepts $ as well as ៛** ([CustomerDetailSheet.tsx](apps/web/src/features/debt/components/CustomerDetailSheet.tsx)): added a ៛/$ toggle in the "ទទួលប្រាក់បំណុល" form; paying in $ converts to ៛ at `getExchangeRate()` and records the ៛ payment (debt stays ៛ — source of truth unchanged), with live ៛ equivalent + currency-aware quick chips. Verified: $3 → recorded 12,000 ៛, balance 20,000 → 8,000 ៛. Founder declined the larger "show debt in its native currency" idea — only the dual-currency repayment was built. Pushed to `main`. NOTE/learning: running `next build` while the preview `next dev` server is live corrupts the shared `.next` dir and makes all Dexie reads return empty (app shows 0 customers/products) — fix is `rm -rf .next` + restart dev. Stop the preview server before `next build`. |
| 2026-06-06 | Deployed all 4 fixes above to Vercel (pushed to `main`). **Added debt filter tabs** ([debt/page.tsx](apps/web/app/(app)/debt/page.tsx)): ទាំងអស់ / នៅជំពាក់ (debtBalance>0, red) / សងអស់ (=0, green) with per-tab counts + tab-aware empty states, matching inventory tab style. Verified: counts update live, owing tab shows only debtors. **Wired the dead "លុបទិន្នន័យទាំងអស់" reset button** ([settings/page.tsx](apps/web/app/(app)/settings/page.tsx) + new `backupService.clearAll()`): confirm dialog (mirrors sign-out) → wipes all 8 Dexie tables → re-seeds clean demo (17 products, 5 customers) → reloads. Verified end-to-end: a 7777 debt marker was wiped, result = 5 clean customers / 17 products / 0 sales. Both pushed to `main`. |

---

## Next Task (after this one)
**Feature: Authentication Flow** — Login screen, Supabase Auth integration, tenant onboarding, protected routes, session persistence for offline use.
