# APP_AUDIT — Rural POS (UI-layer redesign brief)

Read-only audit as of 2026-10-03, at commit `8a2d62f`. All paths are relative to `apps/web/` unless stated otherwise. No secrets or customer data are included.

---

## 1. Tech stack

| Area | What's used | Where |
|---|---|---|
| Platform | **Web app / PWA-style** (mobile-first, runs in the browser). Not native. | `package.json` |
| Framework | Next.js `^15.3.2` (App Router), React `^19.0.0` | `package.json`, `app/` |
| Language | TypeScript `^5.7.3` (strict, `exactOptionalPropertyTypes`) | `tsconfig.json` |
| Styling | Tailwind CSS `^4.1.6` (`@theme` tokens in CSS, no `tailwind.config`) | `app/globals.css` |
| UI kit | **None.** Everything is hand-built Tailwind markup. | — |
| Icons | `lucide-react ^0.469.0`, plus emoji used as icons (categories, products, payment methods) | across `src/`, `app/` |
| Fonts | Noto Sans Khmer (400/500/600/700) via `next/font/google`, exposed as `--font-khmer` | `app/layout.tsx`, `app/globals.css` |
| State | Zustand `^5.0.3` (several stores persisted to localStorage) | `src/store/*.ts` |
| Routing | Next.js App Router (file-based). No separate router library. | `app/` |
| Local DB | Dexie `^4.0.10` + `dexie-react-hooks` (IndexedDB, offline source of truth) | `src/db/schema.ts` |
| Backend | Supabase (`@supabase/ssr`, `@supabase/supabase-js`). Optional; the current deploy runs in **Demo mode** without it. | `src/lib/supabase/`, `middleware.ts` |
| Sync | Custom queue and sync engine | `src/sync/queue.ts`, `src/sync/engine.ts` |
| i18n | `next-intl ^3.26.3` provider (Khmer only) | `src/components/Providers.tsx`, `src/i18n/km.json` |
| Forms | `react-hook-form`, `zod` (installed) | `package.json` |
| Barcode | `@zxing/browser`, `@zxing/library` (camera scanning) | `src/features/sales/components/BarcodeScannerSheet.tsx`, `src/features/inventory/components/BarcodeScanMini.tsx` |
| Image export | `html2canvas` (receipt image, customer statement image) | `SaleReceiptSheet.tsx`, `CustomerDetailSheet.tsx` |
| PWA | `@ducanh2912/next-pwa` is installed but **disabled** (no service worker) | `next.config.ts` comment |

---

## 2. Folder structure

```
apps/web/
├── app/                      Next.js routes
│   ├── layout.tsx            Root: font, metadata, viewport, <Providers>
│   ├── globals.css           Design tokens (@theme), base styles, keyframes
│   ├── (auth)/login/         Login screen (Supabase or Demo Mode)
│   └── (app)/                Authenticated shell + all main screens
│       ├── layout.tsx        Bottom tab bar, sync bar, PWA banner, notifications
│       └── <route>/page.tsx  One folder per screen (see §3)
├── middleware.ts             Auth gate → redirects to /login
├── src/
│   ├── components/
│   │   ├── ui/               Generic primitives (Button, Input, Badge, …)
│   │   ├── shared/           App-wide widgets (SyncStatusBar, PWA banner, fly-to-cart)
│   │   └── Providers.tsx     Intl provider, online/offline listener, sync engine
│   ├── features/             Feature modules (screen-level components + sheets)
│   │   ├── sales/            POS, cart, checkout, receipt, shift open/close
│   │   ├── inventory/        Product form, restock, stock history, mini scanner
│   │   ├── debt/             Customer detail/edit/form/profile, debt reconcile
│   │   ├── expense/          Expense form, category detail
│   │   ├── reports/          Report export sheet
│   │   ├── settings/         Backup / restore sheet
│   │   └── barcode/          (folder present)
│   ├── services/             Business logic over Dexie (sale, debt, product, …)
│   ├── store/                Zustand stores (sale cart, profile, categories, units, …)
│   ├── db/                   Dexie schema and DB instance
│   ├── lib/                  money, date, search, dueDate, uuid, supabase clients
│   ├── sync/                 Offline sync queue and engine
│   ├── i18n/                 km.json (Khmer messages)
│   └── types/                Domain types, branded types, Supabase types
```

---

## 3. Screens & navigation

### 3.1 Routes (13 pages)

| Screen | File | Route | Purpose |
|---|---|---|---|
| Login | `app/(auth)/login/page.tsx` | `/login` | Email/password login (only if Supabase is configured), plus "🏪 ចូល Demo Mode" |
| Home / Dashboard | `app/(app)/page.tsx` | `/` | Today's sales and profit cards, low-stock card, debtors card, 4 quick actions |
| Sell / POS | `app/(app)/sell/page.tsx` → `src/features/sales/components/POSScreen.tsx` | `/sell` | Product grid, search, categories, cart, checkout, shift open/close, held invoices, scan |
| Inventory | `app/(app)/inventory/page.tsx` | `/inventory` | Product list, low/out-of-stock filters, add/edit product, restock |
| Reports | `app/(app)/reports/page.tsx` | `/reports` | Period filter, revenue/expenses/net profit, best/slow sellers, sales list, export |
| Receipts history | `app/(app)/receipts/page.tsx` | `/receipts` | Past sales list → reprint receipt |
| More (hub) | `app/(app)/more/page.tsx` | `/more` | Grouped menu linking to Customers, Debt, Expenses, Staff, Settings |
| Customers | `app/(app)/customers/page.tsx` | `/customers` | Customer list, add, profile, edit, debt detail |
| Debt ledger | `app/(app)/debt/page.tsx` | `/debt` | Debtor list, totals, filters, add customer → customer debt detail |
| Expenses | `app/(app)/expenses/page.tsx` | `/expenses` | Period filter (incl. custom range), total, 6 category cards, history, add expense |
| Settings | `app/(app)/settings/page.tsx` | `/settings` | Store info, cashier, currency rate, units, receipt options, backup, danger zone, logout |
| Staff | `app/(app)/staff/page.tsx` | `/staff` | **Placeholder** ("កំពុង​អភិវឌ្ឍ") |
| Suppliers | `app/(app)/suppliers/page.tsx` | `/suppliers` | **Placeholder** ("កំពុង​អភិវឌ្ឍ"), linked from Inventory |

### 3.2 Navigation map

- **Bottom tab bar** (`app/(app)/layout.tsx`, `NAV`): ទំព័រដើម `/` · លក់ `/sell` · ស្តុក `/inventory` · របាយការណ៍ `/reports` · ច្រើនទៀត `/more`. Badges: low-stock count on Inventory, debtor count on More. The More tab stays highlighted on `/debt`, `/customers`, `/expenses`, `/settings`, `/staff`. The Inventory tab covers `/suppliers`; the Reports tab covers `/receipts`.
- **Stack-like links:** Home quick actions → `/sell`, `/inventory`, `/expenses`, `/debt`. More → its 5 items. Inventory → `/suppliers`. Reports → `/receipts`, `/expenses`.
- **No drawer.** All secondary flows are **bottom sheets on phone and centered modals on tablet** (22 files use a `fixed inset-0` overlay).

| Sheet / dialog | Opened from |
|---|---|
| `CartPanel` (bottom sheet on phone) | POS checkout bar |
| `CheckoutSheet` | Cart pay buttons (cash / debt / partial) |
| `SaleReceiptSheet` | POS success dialog; via `ReprintReceipt` from Receipts, Customers, `SaleDetailSheet`, `CustomerDetailSheet` |
| `HeldInvoicesSheet` | POS header ⏸ button |
| `BarcodeScannerSheet` | POS header scan button |
| `OpenShiftSheet` / `CloseShiftSheet` → `StoreHistorySheet` | POS header shift button |
| Success dialog (inline in `POSScreen.tsx`) | After a sale |
| `ProductFormSheet` → `StockHistorySheet`, `BarcodeScanMini` | Inventory |
| `RestockSheet` | Inventory |
| `SaleDetailSheet`, `ReportExportSheet` | Reports |
| `CustomerFormSheet`, `CustomerDetailSheet` (→ `CustomerEditSheet`, `ReprintReceipt`, payment confirm, void confirm) | Debt, Customers |
| `CustomerProfileSheet` | Customers |
| `ExpenseFormSheet`, `ExpenseCategorySheet` | Expenses |
| `BackupSheet` | Settings |

### 3.3 Phone vs tablet/iPad

- Breakpoints are custom in `app/globals.css`: `sm 390px`, `md 768px`, `lg 1024px`. There is no orientation-specific code and no `matchMedia` layout logic.
- **App shell** (`app/(app)/layout.tsx`): `max-w-[430px] md:max-w-full` — phone-width column below 768px, full width above.
- **POS** (`POSScreen.tsx`):
  - **Phone (< md):** 3-column grid, a "មើលរទេះ" checkout bar, and the cart as a bottom sheet.
  - **md and up:** the cart is a permanent right sidebar (`w-72`, `lg:w-[22rem]`), and the grid uses `md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]`.
- **All sheets:** bottom sheet on phone (`items-end`, `rounded-t-2xl`); centered modal on md+ (`md:items-center md:max-w-md md:rounded-2xl`).
- **Settings:** a few `md:` adjustments (6 uses). Every other page is a single column at all sizes and simply stretches on tablet.

---

## 4. Features per screen

| Screen | Features |
|---|---|
| Login | Supabase email/password (hidden when not configured), Demo Mode button, Khmer error messages |
| Home | Today's sales (៛/$/count), today's profit (revenue − expenses), low-stock shortcut, debtor total shortcut, quick actions (sell, add product, add expense, collect debt). Browser notifications for low stock and debt due dates (`app/(app)/layout.tsx`). |
| **Sell / POS** | Search (Khmer, English, barcode, price — `src/lib/search.ts`), category tabs with counts, product grid (image or emoji, price ៛/$, stock badge), fly-to-cart animation, camera barcode scan, cart (qty ±, **per-line discount**, remove, clear), **hold/park invoice** and resume, checkout: **cash** (KHR/USD tender, change), **debt** (customer required, inline quick-add), **partial** (pay now + owe the rest), **order discount**, success dialog, **receipt** (preview, `window.print()`, PNG image via html2canvas, text share via `navigator.share`), **shift open/close** (opening cash, daily summary: total/cash/ABA/debt/expenses/net profit), store history |
| Inventory | List, filters (all / ⚠️ low / 🔴 out), add/edit product (name KM/EN, barcode with scan, unit, category, cost/sell price, stock, low threshold, emoji or **photo** via camera/file), restock with note, stock movement history, link to Suppliers |
| Reports | Periods today / 7d / 30d, revenue / expenses / net profit, 🔥 best sellers and 🐢 slow movers (by qty), sales list → sale detail → reprint, export (preview, print popup, share) |
| Receipts | History of sales → reprint |
| Customers | List, search, add, profile, edit, open debt detail, reprint invoices |
| Debt ledger | Debtor list and totals, filters, add customer. **Customer detail:** due date (+7/+15/+30), receive payment = **pick one invoice and pay it in full** (methods: cash / ABA / bank transfer) with a confirm dialog, add manual or old debt, invoice list (settled styling), payment history with swipe-to-void, statement image share |
| Expenses | Periods today / 7d / 30d / **custom range**, total ៛/$, 6 category cards → category detail, history, add expense |
| Settings | Store name/address/phone/logo, cashier name, **exchange rate**, units, receipt toggles (logo/address/phone/cashier) + header note + footer, backup/restore (`BackupSheet`), delete all data, logout |
| More | Navigation hub only |

**Not present (none):** item modifiers/options, split bill, KHQR, card/payment SDK, Bluetooth/ESC-POS printer integration, users/roles, language switch, dark mode, member/loyalty.

**Partial or behind flags:**
- Staff and Suppliers pages are placeholders.
- Settings rows "គ្រប់គ្រងអ្នកប្រើ" and "ការជាវ SaaS" have **no `onClick`** (`app/(app)/settings/page.tsx:407-408`).
- Supabase login and cloud sync only activate when the env vars are present.
- PWA/offline install is disabled (`next.config.ts`).
- Known bug **BUG-AUTH-001**: Demo mode logs the user out after 24h (`KNOWN_ISSUES.md` at the repo root).

---

## 5. Theme & styling today

**Where styles are defined:**
- Tokens: `app/globals.css` `@theme` — the single source of tokens.
- Everything else: **inline Tailwind utility classes** in each component. There are no style constants or variant files apart from `src/components/ui/*`.

### Colors (`app/globals.css`)

| Token | Values (50 → 800) |
|---|---|
| `primary` (blue) | `#eff6ff #dbeafe #bfdbfe #93c5fd #60a5fa #3b82f6 #2563eb #1d4ed8 #1e40af` |
| `success` (emerald) | `#ecfdf5 #d1fae5 #a7f3d0 #6ee7b7 #34d399 #10b981 #059669 #047857 #065f46` |
| `danger` (red) | `#fef2f2 #fee2e2 #fecaca #fca5a5 #f87171 #ef4444 #dc2626 #b91c1c #991b1b` |
| `warning` (amber) | `#fffbeb #fef3c7 #fde68a #fcd34d #fbbf24 #f59e0b #d97706 #b45309 #92400e` |
| `slate` (**overridden to warm stone**) | `#faf9f6 #f3f1ec #e8e4dd #d8d2c9 #a8a097 #79716a #57514b #44403a #2b2621 #1c1815` (50→900) |
| `surface` / `surface-card` | `#f4f2ed` / `#fffdfa` |

- Theme color `#2563eb` (`app/layout.tsx`); body text `#1c1815`.
- **Inline hex outside tokens** appears in 6 files, mostly cool-grey Tailwind defaults that don't match the warm theme: `#2563eb`×5, `#dc2626`×4, `#94a3b8`×4, `#64748b`×4, `#e2e8f0`×3, `#1e293b`×2, and others. Files: `SaleReceiptSheet.tsx`, `ReportExportSheet.tsx`, `CustomerDetailSheet.tsx`, `ProductFormSheet.tsx`, `FlyToCartOverlay.tsx`, `app/layout.tsx`.

### Typography

There is no type scale; sizes are arbitrary `text-[Npx]` values. Usage counts:

| Size | Count |
|---|---|
| 12px | 198 |
| 11px | 152 |
| 13px | 139 |
| 14px | 88 |
| 10px | 87 |
| 15px | 51 |
| 16px | 47 |
| 18px | 20 |
| 19px | 16 (page titles) |
| 20px | 15 |
| 9px | 13 |
| 22px | 12 |
| 17px | 7 |
| 24px | 6 |
| 26px | 5 |
| 32px | 4 |
| 10.5px | 3 |
| 28px | 2 |
| 7px, 30px, 34px, 36px | 1 each |

Named Tailwind sizes appear only 9 times. Weights in use: medium, semibold, bold, extrabold, black.

### Spacing, radii, shadows

- **Spacing:** Tailwind default scale, inline.
- **Radii:** `rounded-xl` 165, `rounded-full` 124, `rounded-2xl` 94, `rounded-lg` 62, `rounded-3xl` 1. There are no radius tokens.
- **Shadows** (tokens): `shadow-xs`, `shadow-soft`, `shadow-card` (37 uses), `shadow-panel`, `shadow-pop` (27 uses).
- **Shadows** (Tailwind defaults also used): `shadow-sm` 24, `shadow-lg` 10, `shadow-md` 4, plus colored `shadow-primary-600/25`.

### Motion

- Keyframes: `sheet-up`, `toast-in`, `fly-pop`.

### Base rules

- **All `button`, `a` and `[role=button]` elements get `min-height: 48px; min-width: 48px`** (`globals.css`). Many places override this with `min-h-0 min-w-0`.
- Inputs are forced to 16px to stop iOS zoom.

### Dark mode, localization, currency

- **Dark mode:** none — no `dark:` classes and no `prefers-color-scheme` rules.
- **Localization:**
  - Khmer only (`<html lang="km">`).
  - `src/i18n/km.json` holds ~89 keys (nav, common, auth, sales, inventory, debt, reports, settings, sync, errors). However, **`useTranslations` is used nowhere**: every visible string is hard-coded Khmer in the JSX.
  - Some English is mixed in, e.g. "Cash", "ABA", "Backup / Restore", "SaaS", "Demo Mode".
- **Currency** (`src/lib/money.ts`):
  - All amounts are stored as **integer KHR** (branded `KHR` type).
  - USD is display-only: `formatUSD` = KHR ÷ rate.
  - The rate defaults to **4000**. It is user-set in Settings (`useStoreProfile.exchangeRate`) and pushed to the lib in `Providers.tsx`. There is no live rate source.
  - Formats: `formatKHR` → `5,000 ៛`; `formatUSD` → `$1.25`; `formatDual` → `៛ · $`.
  - Checkout accepts cash tendered in KHR and/or USD.

---

## 6. Reusable components

| Component | Path | Main props | Used by |
|---|---|---|---|
| `Button` | `src/components/ui/Button.tsx` | `variant` primary/success/danger/secondary/ghost, `size` sm/md/lg, `fullWidth` | **0 files** |
| `Input` | `src/components/ui/Input.tsx` | `label`, `error`, native input props | **0 files** |
| `Badge` | `src/components/ui/Badge.tsx` | `label`, `variant` default/success/danger/warning | **0 files** |
| `NumericPad` | `src/components/ui/NumericPad.tsx` | `value`, `onChange`, `maxLength` | **0 files** |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | `icon`, `title`, `description?`, `action?`, `fullHeight?` | 9 files |
| `SearchInput` | `src/components/ui/SearchInput.tsx` | `value`, `onChange`, `placeholder?`, `className?`, `autoFocus?` | 5 files |
| `SyncStatusBar` | `src/components/shared/SyncStatusBar.tsx` | none (reads `useSyncStore`) | app layout |
| `PWAInstallBanner` | `src/components/shared/PWAInstallBanner.tsx` | none | app layout |
| `FlyToCartOverlay` | `src/components/shared/FlyToCartOverlay.tsx` | `items`, `onDone` | POS |
| `ProductCard` (product tile) | `src/features/sales/components/ProductCard.tsx` | `product`, `index`, `onFly?` | POS |
| `CategoryTabs` | `src/features/sales/components/CategoryTabs.tsx` | `categories`, `active`, `onChange`, `counts` | POS |
| `CartPanel` | `src/features/sales/components/CartPanel.tsx` | `onPay(type)`, `onHold` | POS (sidebar + sheet) |
| `CartLineItem` (cart line) | `src/features/sales/components/CartLineItem.tsx` | cart item (qty, line discount) | CartPanel |
| `StoreDaySummaryView` | `src/features/sales/components/StoreDaySummaryView.tsx` | `summary` | Close shift, store history |
| `ReprintReceipt` | `src/features/sales/components/ReprintReceipt.tsx` | `sale`, `onClose` | 4 places |
| Page-local helpers | inside page files | — | `QuickAction` (home), `ProductRankCard` (reports), `SectionHeader` / `Field` / `ToggleRow` / `SettingRow` (settings), `SwipeRow` (customer detail) |

**Missing shared pieces (re-implemented inline):**
- **Bottom sheet / modal shell:** 22 files each write their own `fixed inset-0` overlay and sheet container.
- **Page header:** the same `<header>` with `text-[19px]` title is copied in every page.
- **Cards, primary CTAs, segmented period filters** (Reports and Expenses each have their own), **currency toggles, confirm dialogs** (2 copies in `CustomerDetailSheet.tsx`), **stat tiles**.

**Heaviest inline-styled screens:**

| File | Lines |
|---|---|
| `CustomerDetailSheet.tsx` | 1116 |
| `ProductFormSheet.tsx` | 887 |
| `CheckoutSheet.tsx` | 883 |
| `reports/page.tsx` | 693 |
| `POSScreen.tsx` | 648 |
| `settings/page.tsx` | 646 |
| `SaleReceiptSheet.tsx` | 583 |

---

## 7. Data shown in the UI

Types live in `src/types/index.ts`; Dexie tables in `src/db/schema.ts`.

| Model | Fields rendered |
|---|---|
| Product | `nameKm`, `nameEn`, `barcode`, `unit`, `sellPrice`, `costPrice`, `stockQty`, `lowStockThreshold`, `categoryId`, `emoji`, `imageUri` |
| Category | `id`, `label` — Zustand store `src/store/category.store.ts`, not a DB table |
| Unit | Zustand store `src/store/unit.store.ts` |
| CartItem | `product`, `qty`, `unitPrice`, `lineDiscount` |
| Sale (order) | `receiptNumber`, `totalAmount`, `paidAmount`, `paymentType` (`cash`/`debt`/`partial`), `customerId`, `createdAt`, `isVoid` |
| SaleItem (order line) | `nameKm`, `qty`, `unitPrice`, `subtotal` |
| Customer | `nameKm`, `phone`, `address`, `note`, `imageUri`, `debtBalance`, `dueDate` |
| DebtTransaction (payment) | `amount`, `type` (charge/payment), `method` (cash/aba/bank), `note`, `createdAt` |
| CashDrawer (shift) | `cashierName`, `openingBalance`, `openedAt`, `closedAt`, `note`, plus the computed daily summary |
| Expense | `amount`, `categoryId` (6 fixed categories), `note`, `spentAt` |
| HeldInvoice | `label`, `items`, `total`, `count`, `createdAt` |
| StockMovement | `productName`, `type`, `delta`, `qtyBefore`, `qtyAfter`, `note`, `createdAt` |
| Report | Computed in the page, not stored (revenue, expenses, net profit, rankings) |
| Modifier / Payment entity | **none** |

**Images:**
- Products: **real photos optional**. They are stored as resized base64 JPEG data-URLs in IndexedDB (`ProductFormSheet.tsx:42-73`); otherwise an **emoji placeholder** is shown (default `📦`).
- Customers: optional photo, otherwise their initial letter.
- Store logo: base64 data-URL in `storeProfile`.

---

## 8. Constraints & risks for a visual redesign

**UI and logic tightly mixed (risky to restyle):**
- `CustomerDetailSheet.tsx`: payment, void, manual debt, due date, statement export and reconciliation calls all live in one 1116-line component.
- `CheckoutSheet.tsx`: tender, change, discount and customer-picker logic interleaved with markup.
- `POSScreen.tsx`: the sale finalization (`finalizeSale`) and receipt building sit beside the layout.
- `reports/page.tsx`: aggregations are computed inline in the page.
- `settings/page.tsx`: form state plus destructive actions.

**Layouts tied to output (change with care):**
- **Receipt** (`SaleReceiptSheet.tsx`):
  - The on-screen receipt DOM (`receiptRef`) **is** what html2canvas exports as the shared image.
  - `window.print()` prints the page; there is **no print stylesheet**.
  - `buildShareText` produces fixed-width plain text (32 columns).
  - Restyling the receipt card changes the printed and shared output directly.
- **Report export** (`ReportExportSheet.tsx`): writes its own HTML with inline hex colors into a popup window for printing.
- **Customer statement image** (`CustomerDetailSheet.tsx`): captured via html2canvas.
- **Fly-to-cart animation** measures the cart button and sidebar rects (`cartBtnRef`, `cartPanelRef` in `POSScreen.tsx`). Keep those elements and refs.
- **Swipe-to-void** rows (`SwipeRow` in `CustomerDetailSheet.tsx`) depend on pointer handling and translateX.

**Native / third-party UI that is hard to restyle:**
- Camera barcode scanner video (zxing).
- Native `<input type="date">` and file/camera pickers.
- `navigator.share` sheet and browser print dialog.
- Browser notifications.
- There is **no** payment SDK, printer SDK or KHQR.

**Must not change:**
- Required flows: debt sales need a customer; each debt payment settles exactly one invoice; confirm before "សង​ពេញ".
- KHR-integer money formatting.
- The 48px minimum touch target (rural, touch-first users).
- Khmer font rendering, including Khmer zero-width spaces (`​`) used in labels for line breaking.

---

## 9. Recommendation — safest order to apply a new design system

1. **Tokens first.** Change `app/globals.css` only: colors, a type scale (e.g. `--text-xs…--text-3xl`), radius tokens, shadow tokens, an optional dark palette. Because `slate-*` is already overridden centrally, palette changes propagate app-wide with no component edits.
2. **Replace off-token colors.** Swap inline hex for tokens or CSS variables in `SaleReceiptSheet.tsx`, `ReportExportSheet.tsx`, `CustomerDetailSheet.tsx`, `ProductFormSheet.tsx`, `FlyToCartOverlay.tsx` and `app/layout.tsx` (themeColor). Verify print and image exports after this step.
3. **Shared primitives.** Restyle and extend `src/components/ui/*` (Button, Input, Badge, NumericPad, EmptyState, SearchInput). Add the missing pieces: `Sheet`/`Modal`, `PageHeader`, `Card`, `StatTile`, `SegmentedControl`, `ConfirmDialog`. These should be purely presentational with no logic.
4. **App shell.** `app/(app)/layout.tsx` (tab bar, sync bar) and `src/components/shared/*`.
5. **POS components.** `ProductCard`, `CategoryTabs`, `CartLineItem`, `CartPanel`, then the `POSScreen` header and grid. Highest traffic, lowest logic.
6. **Simple screens.** Home, More, Receipts, Customers, Debt list, Expenses, Staff, Suppliers, Login: swap headers, cards and empty states to shared components.
7. **Sheets.** Migrate to the shared `Sheet` shell one at a time: Open/Close shift, Held, Restock, Expense, Customer form/edit/profile, Backup, Stock history, Store history.
8. **High-risk last.**
   - `CheckoutSheet`, `CustomerDetailSheet`, `ProductFormSheet`, `reports/page.tsx`, `settings/page.tsx`: markup changes only, keeping handlers intact.
   - `SaleReceiptSheet` and `ReportExportSheet`: re-verify print, PNG and share output.

---

## Summary

- **Screens:** 13 routes (12 in the app shell + login), 2 of them placeholders (Staff, Suppliers), plus **~20 sheets/dialogs**.
- **Components:** 36 component files.

  | Group | Files |
  |---|---|
  | `ui/` | 6 |
  | `shared/` | 3 |
  | `Providers` | 1 |
  | `features/*` | 27 |

  Plus ~8 page-local helpers.

**Top 5 UI problems:**

1. **No shared Sheet/Modal component.** 22 files hand-roll overlay and sheet markup, so spacing, radii, close buttons and animations drift.
2. **Shared primitives are unused.** `Button`, `Input`, `Badge` and `NumericPad` have **0 imports**; every screen styles its own buttons and inputs inline.
3. **No type scale.** There are 22 arbitrary `text-[Npx]` sizes, and many labels are 9–11px (252 uses of ≤11px). That is small for rural, older users.
4. **Off-token colors.** Inline hex in 6 files, including cool-grey values (`#64748b`, `#94a3b8`, `#e2e8f0`) that clash with the warm `slate` override. The global 48px min-size forces scattered `min-h-0 min-w-0` overrides.
5. **No dark mode and i18n not wired.** `km.json` exists but no screen uses it. Strings are hard-coded Khmer with stray English ("Cash", "ABA", "Backup / Restore", "SaaS").
