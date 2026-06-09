# PROJECT AUDIT — Rural POS System

> ការវិភាគ project ទាំងមូល (read-only — មិនបានកែ code)
> **កាលបរិច្ឆេទ:** 2026-06-07
> **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · Zustand · Dexie/IndexedDB · Supabase (backend — មិនទាន់ភ្ជាប់) · next-intl (km)
> **Mode បច្ចុប្បន្ន:** Demo / Offline-first (data នៅ device មួយ តាម IndexedDB)

---

## សេចក្ដីសង្ខេប (Executive Summary)

App នេះជា **POS frontend ដែលប្រើការពិតបានប្រចាំថ្ងៃ** លើ device មួយ — core flows (លក់ · បំណុល · ស្តុក · របាយការណ៍) ពេញលេញ និងមាន polish ខ្ពស់។ ប៉ុន្តែ **ស្រទាប់ backend (cloud sync · auth · multi-tenant · billing)** នៅខ្វះច្រើន ដូច្នេះវាមិនទាន់ជា SaaS product ដែលលក់បាន​ឡើយ។

- **MVP (POS device មួយ):** ~ **88%**
- **Production-ready (SaaS ពិត):** ~ **40%**

---

## 1. Modules ដែលរួចរាល់ (Completed)

| Module | ស្ថានភាព | ព័ត៌មានលម្អិត |
|---|---|---|
| **លក់ (POS / Sales)** | ✅ រួចរាល់ | Cart, search (ខ្មែរ+EN+barcode+តម្លៃ), category tabs, fly-to-cart animation, ProductCard ជាមួយ low/out-of-stock state |
| **Checkout** | ✅ រួចរាល់ | សាច់ប្រាក់ / ជំពាក់ / ផ្នែក (partial), discount, toggle ៛/$, quick-cash chips, ប្រាក់អាប់ (change) ឃើញជានិច្ច |
| **វិក្កយបត្រ (Receipt)** | ✅ រួចរាល់ | Share image (html2canvas), browser print, copy text; បង្ហាញ «បានទូទាត់ / នៅខ្វះ» សម្រាប់ partial |
| **បំណុល (Debt)** | ✅ រួចរាល់ | អតិថិជន CRUD, debt ledger + running balance, repayment (៛/$), customer search/quick-add, share statement |
| **ថ្ងៃកំណត់សង (Due dates)** | ✅ រួចរាល់ | កំណត់/ពន្យាថ្ងៃសង, status (ជិតដល់/ផុត), count chips, browser notification «សូមទាក់ទង…», «បានពន្យា X ថ្ងៃ» |
| **ស្តុក (Inventory)** | ✅ រួចរាល់ | Product CRUD, photo/emoji, units & categories គ្រប់គ្រងបាន, តម្លៃ ៛/$, restock, stock history, filter tabs |
| **Low-stock alerts** | ✅ រួចរាល់ | Badge នៅ nav + browser notification ពេលស្តុកធ្លាក់ |
| **Barcode** | ✅ មូលដ្ឋាន | BarcodeScannerSheet (POS) + BarcodeScanMini (form) ប្រើ @zxing camera |
| **វេន / ថត​លុយ (Shift / Cash drawer)** | ✅ រួចរាល់ | OpenShift / CloseShift, cashDrawer.service, stockMovement.service |
| **របាយការណ៍ (Reports)** | ✅ មូលដ្ឋាន | Overview (ថ្ងៃ/៧/៣០ថ្ងៃ), payment breakdown, top products, history list, export/share (image/text); ៛+$ |
| **Settings** | ✅ មូលដ្ឋាន | Store profile, logo, អត្រាប្ដូរ, receipt config, low-stock threshold, backup/restore (JSON), reset data, sign out |
| **Dual currency (៛/$)** | ✅ រួចរាល់ | បង្ហាញ​ទាំង ៛ និង $ គ្រប់កន្លែង; DB រក្សា ៛ ប៉ុណ្ណោះ (financial integrity) |
| **PWA** | ✅ រួចរាល់ | Installable, manifest, service worker, Add-to-Home banner |
| **Offline layer** | ✅ រួចរាល់ | Dexie/IndexedDB (8 tables), sync_queue, UUID client-side |
| **i18n (ខ្មែរ)** | ✅ រួចរាល់ | next-intl, km default, UI ខ្មែរ-first |

---

## 2. Modules មិនទាន់រួច (Incomplete)

| Module | ស្ថានភាព | អ្វីដែលខ្វះ |
|---|---|---|
| **Authentication** | 🟡 ពាក់កណ្ដាល | មាន `signInWithPassword` ពិត + demo mode, តែ **គ្មាន register / sign-up, tenant onboarding, password reset, phone OTP, email verify** |
| **Cloud Sync** | 🟡 ស្រេច code តែមិន​ដំណើរការ | `sync/engine.ts` មាន logic ពិត (upsert/soft-delete + retry + 30s poll) ប៉ុន្តែ run តែពេល `isSupabaseConfigured()` = true។ ឥឡូវ **គ្មាន env / backend ភ្ជាប់** → demo mode សុទ្ធ |
| **Multi-tenant SaaS** | 🟡 schema តែ​គ្មាន flow | Migration មាន RLS `tenant_isolation` policies តែ **គ្មាន UI បង្កើត tenant / onboarding / tenant ID ពិត** (hard-code `tenant-demo`) |
| **Backend DB schema** | 🟡 មិនពេញ | Migration `001` មាន ៧ tables តែ local មាន ៨ — **ខ្វះ `cash_drawers`, `stock_movements`** + ខ្វះ column `due_date`/`due_date_original` លើ `customers` |
| **Reports (ស៊ីជម្រៅ)** | 🟡 មូលដ្ឋានតែ | គ្មាន profit/margin, inventory valuation, debt aging, PDF export ពិត |
| **Settings (System)** | 🟡 placeholder | «គ្រប់គ្រងអ្នកប្រើ» និង «ការជាវ SaaS» ជា row ទទេ (គ្មាន onClick) |

---

## 3. Missing Features (មុខងារដែលខ្វះ)

1. **Sign-up / Register + Tenant onboarding** — បង្កើតហាងថ្មី, ម្ចាស់ដំបូង។
2. **Phone OTP / Magic link** — rural users មិនសូវប្រើ email (តាម context.md)។
3. **Multi-user / Staff roles** — ម្ចាស់ vs អ្នកគិតលុយ, សិទ្ធិ (permissions), តាមដាន «អ្នកណាលក់»។
4. **Subscription / Billing** — subscription tier enforcement, KHQR/Wing/ABA payment, free trial, subscription reminder (push/Telegram)។
5. **Cloud auto-backup & cross-device restore** — ឥឡូវ backup ជា JSON ដោយដៃប៉ុណ្ណោះ។
6. **Sync status ពិត** — SyncStatusBar មាន UI តែ​គ្មាន backend → មិនបង្ហាញ sync ពិត។
7. **Categories / Units sync** — រក្សាក្នុង `localStorage` (Zustand persist) ប៉ុណ្ណោះ → បាត់ពេល clear data, មិន sync, មិន​ចែក​រវាង device។
8. **Thermal printer support** — ឥឡូវ share image / browser print។
9. **Expense tracking (ចំណាយ)** — គ្មាន (ដើម្បីគណនា profit ពិត)។
10. **Supplier / Purchase orders (អ្នកផ្គត់ផ្គង់ / ការ​ទិញចូល)** — គ្មាន។
11. **Product variants / batch / expiry (ថ្ងៃផុតកំណត់)** — គ្មាន (context រៀបរាប់ products ផុតកំណត់)។
12. **Audit log** — ការកែ stock/debt មាន reason តែ​គ្មាន audit trail ពេញលេញ​ឆ្លង device។
13. **Automated tests** — គ្មាន unit/e2e tests (ប៉ះ​នឹង production readiness)។

---

## 4. Missing Workflows (លំហូរការងារដែលខ្វះ)

1. **Onboarding ដំបូង** — ដំឡើង → បង្កើតហាង → បញ្ចូលទំនិញដំបូង → ចាប់ផ្តើមលក់។
2. **Forgot / reset password**។
3. **Sync conflict recovery** — បើ offline ច្រើនថ្ងៃ រួច online: conflict resolution (last-write-wins / append-only) មាន​ក្នុង doc តែ​មិន​បាន​សាក​ជាមួយ backend ពិត។
4. **Subscription lifecycle** — trial → paid → expired → lock features។
5. **Staff invite / login** — ហៅ​អ្នកគិតលុយ​ចូលប្រើ។
6. **Stock-in workflow** — receive delivery → update cost + qty (restock មាន​ផ្នែក​ខ្លះ​តែ​គ្មាន supplier/PO)។
7. **Void / refund sale** — `isVoid` field មាន​ក្នុង schema តែ flow void/refund មិន​ច្បាស់​នៅ UI។
8. **Debt reminder ស្វ័យប្រវត្តិ** — notification ឥឡូវ​ trigger ពេលបើក app; គ្មាន scheduled/Telegram reminder ពិត។

---

## 5. Missing Database Tables (តារាងទិន្នន័យដែលខ្វះ)

**Local (Dexie) មាន ៨:** products, customers, sales, sale_items, debt_transactions, cash_drawers, stock_movements, sync_queue.
**Cloud (migration 001) មាន ៧:** tenants, profiles, products, customers, sales, sale_items, debt_transactions.

| តារាង | Local | Cloud | ចំណាំ |
|---|:---:|:---:|---|
| `cash_drawers` | ✅ | ❌ | ខ្វះក្នុង cloud → វេន​លុយ​មិន sync |
| `stock_movements` | ✅ | ❌ | ខ្វះក្នុង cloud → ប្រវត្តិស្តុក​មិន sync |
| `customers.due_date` / `due_date_original` | ✅ (type) | ❌ | column ខ្វះ​ក្នុង migration |
| `categories` | ❌ | ❌ | localStorage ប៉ុណ្ណោះ (Zustand) |
| `units` | ❌ | ❌ | localStorage ប៉ុណ្ណោះ (Zustand) |
| `store_profile / settings` | ❌ | ❌ | localStorage ប៉ុណ្ណោះ |
| `subscriptions` / `plans` | ❌ | ❌ | សម្រាប់ billing |
| `expenses` | ❌ | ❌ | សម្រាប់ profit ពិត |
| `suppliers` / `purchase_orders` | ❌ | ❌ | stock-in |
| `audit_log` | ❌ | ❌ | financial audit |

> **បញ្ហាសំខាន់:** Dexie schema version 4 — `cash_drawers` & `stock_movements` មិន​មាន​នៅ cloud → ពេលបើក sync នឹង​បាត់​ទិន្នន័យ​ផ្នែក​នេះ។ categories/units/profile មិន​នៅ DB សោះ → device-local។

---

## 6. Missing Reports (របាយការណ៍ដែលខ្វះ)

✅ **មាន:** ចំណូលប្រចាំថ្ងៃ/សប្ដាហ៍/ខែ, payment breakdown (cash/debt), top products, sales history, debt total, export image/text.

❌ **ខ្វះ:**
1. **Profit / margin report** — ចំណេញ​ពិត (sell − cost − expense)។
2. **Inventory valuation** — តម្លៃស្តុក​សរុប (qty × cost)។
3. **Debt aging** — បំណុល​តាម​អាយុ (០–៣០, ៣០–៦០, ៦០+ ថ្ងៃ)។
4. **Slow-moving / dead stock** — ទំនិញ​លក់​យឺត។
5. **Cash drawer / shift report** — សង្ខេប​វេន (បើក/បិទ, លុយ​ខ្វះ/លើស)។
6. **PDF export ពិត** — ឥឡូវ​តែ image + browser print។
7. **Date-range picker custom** — ឥឡូវ​តែ preset (ថ្ងៃ/៧/៣០)។
8. **Comparison (ខែ​នេះ vs ខែ​មុន)**។

---

## 7. Missing Settings (ការកំណត់ដែលខ្វះ)

✅ **មាន:** ព័ត៌មានហាង, logo, អ្នកគិតលុយ, អត្រាប្ដូរ ($), receipt config, low-stock threshold, backup/restore, reset data, sign out។

❌ **ខ្វះ / placeholder:**
1. **គ្រប់គ្រងអ្នកប្រើ (Users & roles)** — row ទទេ (គ្មាន onClick)។
2. **ការជាវ SaaS (Subscription)** — row ទទេ។
3. **Cloud account / sync settings** — link Supabase, sync now, sync status។
4. **ភាសា (Language)** — km/en toggle (ឥឡូវ km fixed)។
5. **Notification preferences** — បើក/បិទ alert ស្តុក/បំណុល, កំណត់ «ជិតដល់ថ្ងៃសង» = ប៉ុន្មានថ្ងៃ (ឥឡូវ hard-code ៣ ថ្ងៃ)។
6. **Tax / VAT, rounding rule, receipt number format**។
7. **Theme** — accent ឥឡូវ​ខៀវ ខណៈ design lock = «warm» (មិន​ទាន់​ត្រូវ​គ្នា)។

---

## 8. Production Readiness Score: **~40%**

| ផ្នែក | ពិន្ទុ | មូលហេតុ |
|---|:---:|---|
| Frontend / UX | 90% | ស្អាត, mobile-first, ខ្មែរ-first, polish ខ្ពស់ |
| Offline / local data | 85% | Dexie រឹងមាំ; categories/units ត្រឹម localStorage |
| Backend ភ្ជាប់ពិត | 15% | engine ស្រេច​តែ​មិន deploy/config; schema មិន​ពេញ |
| Authentication | 30% | signIn ពិត​តែ​គ្មាន register/onboarding/reset |
| Multi-tenant isolation | 30% | RLS policy មាន​តែ​គ្មាន tenant flow ពិត |
| Billing / subscription | 0% | គ្មាន |
| Security (keys, RLS, env) | 35% | service-role មិន leak; តែ​គ្មាន env ពិត, គ្មាន test RLS |
| Testing / CI | 5% | គ្មាន tests |
| Observability (logs/errors) | 20% | error handling silent​ច្រើន |

> **សេចក្ដីសន្និដ្ឋាន:** រួចជា **demo / pilot លើ device មួយ**, តែ​មិន​ទាន់​អាច​ដាក់​លក់​ឲ្យ​អតិថិជន​ច្រើន​ជា SaaS។

---

## 9. MVP Completion Score: **~88%**

(និយមន័យ MVP = POS offline ប្រើ​ប្រចាំ​ថ្ងៃ​លើ device មួយ)

| Capability | ស្ថានភាព |
|---|:---:|
| លក់​លឿន (cash/debt/partial) | ✅ 100% |
| ៛/$ គ្រប់កន្លែង | ✅ 100% |
| គ្រប់គ្រងស្តុក + alert | ✅ 95% |
| បំណុល + ថ្ងៃកំណត់សង + notif | ✅ 95% |
| វិក្កយបត្រ share/print | ✅ 95% |
| របាយការណ៍​មូលដ្ឋាន | ✅ 80% |
| Barcode scan | 🟡 75% (ត្រូវ​test device ច្រើន, low-light) |
| Backup/restore | ✅ 85% (manual) |
| Settings | 🟡 70% |

> ខ្វះ​តិចតួច​សម្រាប់ MVP: report ស៊ីជម្រៅ​ខ្លះ, polish barcode, និង​ការ​សម្រេច​ចិត្ត​ពី categories/units (localStorage → DB)។

---

## 10. Recommended Next Priorities (អាទិភាពបន្ត)

### 🔴 Phase 1 — Backend Foundation (ដើម្បី​ឲ្យ​ក្លាយ​ជា product)
1. **បំពេញ cloud schema** — បន្ថែម `cash_drawers`, `stock_movements`, `customers.due_date*`, និង `categories`/`units` tables; align នឹង Dexie។
2. **ភ្ជាប់ Supabase ពិត** — env, generate types, test `sync/engine.ts` end-to-end (offline → online flush → conflict)។
3. **Auth flow ពេញ** — register + tenant onboarding + (phone OTP ឬ email), protected routes ពិត (មិន​មែន​តែ demo cookie)។

### 🟠 Phase 2 — SaaS Core
4. **Multi-tenant ពិត** — បង្កើត tenant ពេល register, បញ្ឈប់ hard-code `tenant-demo`, test RLS។
5. **Categories/Units → DB** — ផ្លាស់​ពី localStorage ទៅ Dexie + sync។
6. **Subscription + billing** — tier, KHQR/Wing/ABA, trial, reminder។
7. **Multi-user / roles** — owner/cashier, «អ្នកណាលក់» tracking។

### 🟢 Phase 3 — Depth & Polish
8. **Reports បន្ថែម** — profit, inventory valuation, debt aging, shift report, PDF។
9. **Cloud auto-backup** + cross-device restore។
10. **Expense / supplier / expiry** modules។
11. **Tests (unit + e2e)** + error logging។
12. **Design decision** — សម្រេច accent (ខៀវ vs warm) ឲ្យ​ត្រូវ​នឹង design ដែល lock។

---

*ឯកសារ​នេះ​ជា​ការ​វិភាគ​ស្ថានភាព​ប៉ុណ្ណោះ — គ្មាន​ការ​កែ​ប្រែ code ឡើយ។*
