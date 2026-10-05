# QA Report — Redesign v2

Branch: `redesign/v2-qa` (from `redesign/v2`). Spec: `QA_FIX_PROMPT.md`.

## How this was tested

- **Browser:** the Claude desktop app's built-in Chromium, driving the local dev server (`next dev`). Playwright is **not** installed and was not added (needs approval per §1.2).
- **Viewports:** 375×667, 390×844, 430×932, 820×1180, 1180×820. Each route is loaded in a same-origin iframe of that exact size and measured:
  - tap targets, horizontal overflow, text < 12px
  - icon-only labels
  - gap between the last content and the tab bar / cart bar
- **Screenshots** in `qa/screenshots/`:
  - Most are DOM captures made with html2canvas. These draw Khmer text a few pixels lower than the real browser does, and sometimes clip the top of a vowel.
  - `B6-B7-checkout-after-browser.jpg` is a real browser screenshot for comparison.
- **Limits:**
  - Chromium cannot emulate iOS `env(safe-area-inset-*)`, so the 47px / 34px insets are checked by reading the CSS formulas, not by rendering.
  - B1, B3, B4 and B5 are Safari-specific. Chrome on desktop can't show them, so they must be confirmed on a real iPhone.
- **Data:**
  - Existing demo seed: 17 products, 5 customers.
  - Every test sale or expense was deleted afterwards and stock was restored. No seed script has been written yet.

B31 is unused: a suspected contrast issue in the iPad cart turned out to be screen-reader-only text.

Severity: **P0** data/money wrong, crash, flow blocked · **P1** feature unreachable/broken · **P2** visual/layout that hurts use · **P3** polish.

## Known bugs (B1–B11)

| ID | Screen / file | Viewport | Steps to reproduce | Expected | Actual | Severity | Status | Fix commit |
|---|---|---|---|---|---|---|---|---|
| B1 | All hero/light headers — `components/ui/PageHeader.tsx` | phones | Open Home or `/sell` | Top padding = `max(env(safe-area-inset-top),12px)+12px`; `/sell` header ≤150px | Hero top padding was `max(56px, inset+20px)`, so there was a 56px gap. `/sell` header was ~164px | P2 | Fixed. Home title now 24px from the top; `/sell` header is 148px at 390. [before](qa/screenshots/B1-B4-home-before.png) / [after](qa/screenshots/B1-B9-B10-home-after.png) | `6e256ab` |
| B2 | `/inventory` — `app/(app)/inventory/page.tsx` | all | Tap "អស់ស្តុក" | The three tiles are buttons with `aria-pressed`, switch all / low / out, accent ring, list updates | "អស់ស្តុក" was a plain `<div>`: there was no "out" filter. The "low" ring was a faint warn colour | P1 | Fixed. 17 → 3 → 1 → 17 items; nothing covers the tiles; the empty-filter text was fixed too (see B12). [after](qa/screenshots/B2-inventory-out-after.png) | `104fc6e` |
| B3 | `/sell` — `ProductCard.tsx`, `ProductThumb.tsx` | phones (iOS Safari) | Open `/sell` on an iPhone | Thumb full card width, 84–96px tall, radius 16; emoji/letter 40–44px; one-line stock pill 8px in | Thumb was ~44px wide (the emoji's width) and the pill wrapped onto two lines | P2 | Fixed. Root cause: a `w-full` % width inside a `<button>`, which iOS Safari resolves as shrink-to-fit. The thumb now stretches with CSS grid. The pill is `whitespace-nowrap` on a solid background. The letter fallback is 44px. In Chromium the thumb is 158 of 174px. **Needs confirmation on iPhone.** [before](qa/screenshots/B3-B11-sell-before.png) / [after](qa/screenshots/B1-B3-B11-sell-after.png) | `12eb073` |
| B4 | Tab shell — `app/(app)/layout.tsx` | phones (iOS Safari) | Home → scroll to the end | Last row fully visible above the tab bar | Rows stayed behind the bar | P1 | Fixed. Root cause: `padding-bottom` sat on the scroll container (`main`), and iOS Safari leaves it out of the scrollable area. Moved to an inner wrapper: `108px + safe-area`. Measured gap = 16px at every phone size. **Needs confirmation on iPhone.** [after](qa/screenshots/B4-home-scrolled-after.png) | `77d306c` |
| B5 | `/sell` grid — `POSScreen.tsx` | phones | Add items → scroll the grid to the end | Last product row above the cart bar | Same root cause as B4 | P1 | Fixed. Inner wrapper `110px + safe-area` while the cart bar is visible. The last card ends at 734, the bar starts at 750. [before](qa/screenshots/B5-sell-cartbar-before.png) / [after](qa/screenshots/B5-sell-cartbar-after.png) | `77d306c` |
| B6 | `CheckoutSheet.tsx`, `Sheet.tsx`, `NumericPad.tsx` | 390×844, 375×667 | Sell → ទូទាត់សាច់ប្រាក់ | Fixed header → scroll → fixed footer; items collapse on phone; whole cash flow fits at 390×844; keys ≥52px; chips in one row | Keypad below the fold (content 1,127px in a 594px area); chips wrapped with an orphan; content looked like it ran under the header | P1 | Fixed. At 390×844 it fits exactly (634/634px). 375×667 scrolls. 430×932 fits. iPad 1180×820 now fits too. Keys are 52px; chips are one horizontally scrolling row; full-screen sheets get a hairline under the header. The logic block is byte-identical. [before](qa/screenshots/B6-B8-checkout-before.png) / [after](qa/screenshots/B6-B8-checkout-after.png) / [real browser](qa/screenshots/B6-B7-checkout-after-browser.jpg) | `a6e346b` |
| B7 | `CheckoutSheet.tsx` | all | Type 10500 on the keypad | Shows `10,500 ៛` (or `$5`) | Showed `10500` | P2 | Fixed. A formatted `formatKHR`/`formatUSD` display sits under a transparent real `<input>`. The state stays the raw string ("5000"), and it works for both the cash and the partial input. | `a6e346b` |
| B8 | `CheckoutSheet.tsx` footer | all | Received < due | "នៅខ្វះ X ៛" in warn colours; confirm disabled; change box only when received ≥ due | Showed "ប្រាក់អាប់ 0 ៛" | P2 | Fixed (display only). 5,000 of 9,000 shows "នៅខ្វះ 4,000 ៛ · $1" and the confirm button is disabled. 50,000 shows "ប្រាក់អាប់ 41,000 ៛". The old red "ប្រាក់ទទួលតិចជាងសរុប" line was removed because the box now says it. [after](qa/screenshots/B6-B7-checkout-change-after.png) | `a6e346b` |
| B9 | Home "ត្រូវធ្វើថ្ងៃនេះ" — `app/(app)/page.tsx` | all | No low stock / no debt | No contradictory rows | "ស្តុកជិតអស់ / ស្តុកគ្រប់គ្រាន់" | P2 | Fixed. The stock and debt rows only show when there's something to do. When neither applies, one "អ្វីៗល្អទាំងអស់" row shows with a success icon. There is no close-shift row on Home. | `f0f3e39` |
| B10 | Home greeting | all | Open Home | No emoji in UI chrome | "សួស្តី សុខា 👋" | P3 | Fixed (emoji removed). Other emoji in UI chrome are logged as B15. | `f0f3e39` |
| B11 | `/sell` category row — `CategoryTabs.tsx` | phones, iPad portrait | Open `/sell` | Momentum scroll, right padding, fade on the right while more pills are hidden | Last pill cut off, no hint | P2 | Fixed. An end spacer (Safari ignores `padding-right` in a scrolling flex row) keeps 32px clear after the last pill. A sticky right-edge fade shows while the row can scroll and hides at the end. `overscroll-x-contain`. | `12eb073` |

## New bugs found so far (B12+)

| ID | Screen / file | Viewport | Steps to reproduce | Expected | Actual | Severity | Status | Fix commit |
|---|---|---|---|---|---|---|---|---|
| B12 | `/inventory` empty filter | all | Tap a filter that matches nothing, with the search box empty | A clear message | "រកមិនឃើញ «»" (empty quotes) | P3 | Fixed with B2 ("គ្មានទំនិញអស់ស្តុក" etc.) | `104fc6e` |
| B13 | Reports history, Receipts, Customer invoices | all | Make a partial sale (pay 5,000 of 6,000) | Labelled "បង់ខ្លះ" | Labelled "ជំពាក់": `POSScreen` saves partial sales as `paymentType: 'debt'` with `paidAmount > 0` (on purpose, "receipt shows debt for partial") | P2 | **Open, waiting for OK.** A display-only fix is possible (`debt && paidAmount > 0` → "បង់ខ្លះ"). Changing how it is stored would be a logic change. | — |
| B14 | Close store — `POSScreen.tsx` | all | Open store → បិទហាង | Success summary shows for 2.5s | Never shows: the sheet only renders while `currentDrawer` exists, and closing sets it to null | P2 | **Open, waiting for OK** (component data flow; pre-existing). | — |
| B15 | Several sheets | all | Look at UI chrome | Lucide icons, not emoji | Emoji used as icons: 🕐 🛒 ❌ ✅ (SaleDetailSheet), 💡 (OpenShift, Backup), 📝 (store/stock history), ⚠️ (product form, customer edit, settings), 💱 📞 (settings), 🎉 (debt), 💵📒👥 (export preview) | P3 | Fixed: all replaced with lucide icons. Document content keeps its emoji: the receipt, print/share text, statement image, OS notifications, and the product emoji picker. The login page was left alone (auth on hold) | `d89803a` `d40e422` `66f2321` |
| B16 | Checkout | all | QA flow "mixed KHR+USD tender" | Pay part in ៛ and part in $ | Not supported: Checkout takes one currency at a time | P2 | **Open: new feature/logic, waiting for OK** | — |
| B17 | Checkout partial | all | QA flow "partial (with due date)" | Set a due date at checkout | Checkout has no due date; it can only be set later in Customer detail | P3 | **Open: feature gap, waiting for OK** | — |
| B18 | Tooling — `apps/web/.eslintrc.json` | — | `npm run lint` | Lint passes | There was no ESLint config, so `next lint` started an interactive setup and never checked anything | P2 | **Fixed (approved 2026-10-05).** Added a legacy `.eslintrc.json` (`next/core-web-vitals` + `next/typescript`). `eslint-config-next` 15.5 ships only legacy configs, so this needs no new packages. It found 2 errors (`catch (err: any)` in both barcode scanners → typed, same behaviour) and removed 8 dead imports/consts. `npm run lint` now passes: 0 errors, 40 warnings. The warnings are listed in B22 | `6e0f356` |
| B19 | Count badge (`Pill variant="count"`) | all | Tab bar / rail badges | Contrast ≥ 4.5:1 | White on `#E5484D` = 3.9:1 | P3 | Open | — |
| B20 | Receipt / statement PNG (html2canvas) | all | Save receipt as image | Text centred in pills / boxes | Text is drawn ~5px lower than on screen (e.g. the "ជំពាក់" pill). Readable, not clipped | P3 | Open | — |
| B21 | Safe areas — `app/layout.tsx` viewport | iPhone standalone | Install as PWA | Insets handled | No `viewport-fit=cover`, so every `env(safe-area-inset-*)` is 0 and iOS letterboxes the page instead. Content is never under the notch, but the inset rules never activate | P3 | Open (decide whether to opt in) | — |
| B22 | Lint warnings (40) | — | `npm run lint` | Clean, or knowingly accepted | 27 × `react-hooks/exhaustive-deps` (mostly `useLiveQuery(...) ?? []` used as a `useMemo` dependency, plus effect deps in RestockSheet, CloseShiftSheet and the barcode scanners); 8 × `no-img-element` (photos are offline data URIs, so `next/image` doesn't fit); 5 × unused vars (`cashDrawer.service.ts`, `sale.store.ts` are in protected folders; `showPay` in CustomerDetailSheet; `storeName`/`session` in POSScreen, where `session` belongs to the auth code that is on hold) | P3 | Open. Fixing the deps warnings changes re-render behaviour, so they need care and an OK | — |
| B23 | Root `pnpm lint` (turbo) | — | Run `pnpm lint` at the repo root | Runs lint in every workspace | turbo stops with "This script calls `turbo`, which calls the script…" (the root `lint` script recurses). `apps/web`'s own `npm run lint` works | P3 | Open (repo config, not app code) | — |
| B24 | `components/ui/StatTile.tsx` (Home hero, customer detail, reports) | 375–430 | Customer owes 13,125,000 ៛ → Home "ជំពាក់" tile | Full amount readable | "13,125,0…": 18px truncated in a ~81px tile | P2 | Fixed. Value size steps 18 → 16 → 15 → 13px by length and stays on one line (checked at 375/390/430). [before](qa/screenshots/B24-debt-detail-before.png) | `8f196fb` |
| B25 | `/inventory` category pills | phones | Many categories | Last pill revealable, hint that the row scrolls | Same as B11 but a separate component: no end spacer, no fade | P3 | Fixed with a stateless CSS mask fade + 40px end spacer | `908b377` |
| B26 | `/debt` list | all | Several debtors, one overdue | Most urgent first? | List is alphabetical; the overdue 13M ៛ customer is 5th | P3 | **Suggestion, waiting for OK** (sort order is behaviour) | — |
| B27 | `ProductFormSheet` | iOS | Tap "បន្ថែមប្រភេទថ្មី…" / "បន្ថែមឯកតាថ្មី…" | Inputs ≥16px (no iOS zoom) | 15px, so iOS Safari zooms the page | P2 | Fixed (16px) | `d40e422` |
| B28 | `ReportExportSheet` | all | Open "នាំចេញ" | Close button ≥48px with a Khmer label | 32px icon-only button with no `aria-label` | P2 | Fixed: 48px, `aria-label="បិទ"` | `d89803a` |
| B29 | Close store summary — `cashDrawer.service.ts` | all | Open store (50,000) → sell → collect 12,000 ៛ debt in cash → 205,000 ៛ expenses → បិទហាង | "សាច់ប្រាក់គួរមានក្នុងថត" = what is really in the drawer | Shows opening + cash sales (80,150 ៛). Cash debt payments (+12,000) are not added and expenses (−205,000) are not subtracted. Cash debt payments appear nowhere in the summary (only ABA does) | P2 | **Open: logic in a protected folder, waiting for OK.** Note that you asked earlier for "no advanced cash reconciliation"; this is a smaller question about what the line means | — |
| B30 | `SyncStatusBar` placement | phones | Go offline on a page with a dark hero | Status visible without breaking the header | The pill sits in a light strip above the dark hero, so on iPhone there is a light band between the status bar and the header | P3 | **Open: design decision** (overlay on the header vs a toast above the tab bar) | — |
| B32 | `ReportExportSheet` | all | Open "នាំចេញ" | Khmer UI | Buttons "Print" / "Share" and title "📤 Export របាយការណ៍" | P3 | Fixed: "បោះពុម្ព" / "ចែករំលែក" / "នាំចេញរបាយការណ៍" | `d89803a` |
| B33 | Settings form — `app/(app)/settings/page.tsx` | all | Save exchange rate 4,100 → reload Settings | The form shows 4,100 | **The form shows 4,000.** Every field is copied into `useState` on the first render, before the persisted store has rehydrated (zustand v5 uses the initial state during hydration). Pressing "រក្សាទុក" then **silently overwrites the saved settings** (exchange rate, store name, phone, receipt options) with the defaults. Present before the redesign | **P1** | **Fixed (approved 2026-10-05).** The form now mounts only after React hydration and after the persisted profile is restored, so the fields start from the saved values; the form logic itself is unchanged. Verified: save 4,100 + cashier ដារ៉ា → reload → the form shows 4,100/ដារ៉ា and no Save button appears; change only the address → save → rate and cashier are kept | `5d020c9` |
| B34 | Backup — `BackupSheet.tsx` | all | Hold an invoice → Export backup → Restore | Held invoices survive | The backup has 8 tables but **not `heldInvoices`** (or the sync queue). Export → restore round trip otherwise verified identical (24 products, 8 customers, 17 sales, 15 debt rows) | P3 | **Open: waiting for OK** (backup format) | — |
| B35 | `/login` | all | Supabase not configured | The email/password fields are hidden | Fields show with no login button, plus a note "Supabase មិនទាន់ configure". Same as before the redesign (only the button was ever hidden) | P3 | **Open: auth is on hold** (BUG-AUTH-001) | — |
| B36 | Settings "ជូនដំណឹងស្តុកតិចនៅ" | all | Change it to 3 → save → reload | The threshold is saved and used | The input is local state only (`useState('5')`). It is never saved or applied; products use their own threshold. It is a dead control | P2 | **Open: waiting for OK** (remove it, or wire it as the default for new products) | — |
| B37 | `SaleDetailSheet` | all | Open a voided sale | Correct Khmer | "ត្រូវបានលុករួចហើយ" (typo for លុប) | P3 | Fixed | `66f2321` |
| B38 | Debt success banner — `CustomerDetailSheet.tsx` | all | Pay the last open invoice | Clear Khmer | "សំណូលអស់ហើយ!": is this the intended word? (emoji removed) | P3 | **Question for you** | — |

## Systematic pass (§3)

**Test data:**
- Created through the real UI (no seed script):
  - 24 products in 7 categories: 2 with a photo, custom emoji, default 📦; long Khmer names; normal / low / out of stock; 500 ៛ to 250,000 ៛.
  - 8 customers: overdue (13,095,000 ៛, long name and address), due today, not yet due, fully paid; one with 5 invoices, 3 payments and 1 voided payment.
  - 17 sales: cash ៛ exact, cash ៛ with change, cash $, debt with an inline quick-add customer, partial, line + order discount, hold → resume → complete, one voided, one held left over.
  - One open store with 3 expenses.
- The local database and local settings were restored to their pre-test state afterwards. Your own earlier sale was kept.

**Layout / touch / text** — every route (12) and every sheet/dialog (28) at 375×667, 390×844, 430×932, 820×1180 and 1180×820:
- 0 horizontal overflow.
- 0 tappables under 48px and 0 icon buttons without a label (after B28).
- 0 text under 12px.
- 0 inputs under 16px (after B27).
- The last content is always reachable (sheet bodies and the tab-bar gap).
- All sheets close with ✕ and with the backdrop.
- Contrast on text is ≥4.5:1, except B19.

**Data correctness:**
- Stock = start − non-voided sales; the void restores it; restock adds +10 with its note.
- Customer balances = charges − non-voided payments, for all 8 customers.
- Reports: revenue 837,650 ៛ − expenses 205,000 ៛ = 632,650 ៛ (16 sales).
- The close-store summary matches a manual calculation: total 831,150 ៛, cash 30,150, ABA 9,000, debt 801,000, net 626,150. See B29 for what the drawer line means.

**Navigation:** the correct tab is highlighted on every route and sub-route (`/customers` → បំណុល, `/suppliers` → ស្តុក, others → ច្រើនទៀត). Badges are right (stock 7, debtors 5). The iPad rail is correct. The offline bar shows.

**Flows checked:**
- Oversell is blocked at the stock level, and out-of-stock items are disabled.
- Barcode: manual entry → found → "+ រទេះ" adds it.
- Exchange rate 4,100 updates USD everywhere (but see B33).
- Backup → restore round trip works (see B34).
- Logout → login → Demo → data intact.
- Export print opens a print window; share sends the text.
- Reprint works from Receipts, Customers and Sale detail.

**Not testable here:**
- A real iOS keyboard covering inputs.
- Standalone/PWA safe areas.
- A real camera.
- The swipe-back gesture.
- Khmer month names: the test browser has no Khmer locale and shows "Oct 5"; Node and iOS show "5 តុលា".

## Not fixed, and why

| ID | Why |
|---|---|
| B13, B14, B16, B17 | Logic or new features. Waiting for your OK |
| B29 | Money logic in `src/services` (protected) |
| B34 | Backup format change |
| B35 | Login page; auth is on hold (BUG-AUTH-001) |
| B36 | Needs a decision: remove the control or make it work |
| B26, B30, B38 | Design or wording decisions for you |
| B19 | Badge colour token change affects the whole app; needs your OK on a darker red |
| B20, B21 | html2canvas rendering / `viewport-fit=cover` opt-in: needs testing on a real iPhone first |
| B22, B23 | Lint warnings and root turbo config: tooling, low risk, separate cleanup |

## Manual test script (iPhone + iPad, ~10 minutes)

1. **Header and tab bar (B1, B4):** open Home on iPhone. The store name sits right under the status bar (no big gap). Scroll to the bottom: the last row stops above the floating tab bar.
2. **Product grid (B3, B5, B11):** open លក់. Product pictures fill the full card width and the "សល់ N" label is on one line. The category row fades on the right and scrolls to the last category. Add 3 items and scroll down: the last product row is above the cart bar.
3. **Stock filters (B2, B25):** open ស្តុក. Tap ស្តុកតិច, then អស់ស្តុក, then ទាំងអស់. The ring moves and the list changes each time.
4. **Checkout fits (B6):** add items → ទូទាត់ → ទូទាត់សាច់ប្រាក់. On iPhone 14 the whole keypad and the "បញ្ចប់ការលក់" button are visible without scrolling. Tap "3 មុខ · … ▾" to open the item list.
5. **Received amount (B7, B8):** type 5 0 0 0 on the keypad. It shows "5,000 ៛" and the yellow box says "នៅខ្វះ …" with the button disabled. Tap a larger chip: the green "ប្រាក់អាប់" appears. Finish the sale.
6. **USD:** sell again, switch to "$ ដុល្លារ", tap $5. It shows "$5 = 20,000 ៛" and the change is correct.
7. **Debt + partial:** sell with ជំពាក់ (pick or quick-add a customer), then with បង់ខ្លះ. Open បំណុល → the customer → "សងពេញ" → choose ABA → confirm. Only that invoice is marked សងរួច.
8. **Long amounts (B24):** a customer owing millions shows the full amount on Home and in the customer screen (no "…").
9. **Product form (B27):** ស្តុក → ទំនិញថ្មី → tap "បន្ថែមប្រភេទថ្មី…". The page must not zoom in.
10. **iPad:** repeat steps 2, 4 and 7 in portrait and landscape. The rail highlights the right item, the cart sidebar is on the right, and checkout shows two columns.
