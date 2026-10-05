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
| B15 | Several sheets | all | Look at UI chrome | Lucide icons, not emoji | Emoji as icons: 🕐 🛒 ❌ ✅ (SaleDetailSheet), 💡 (OpenShiftSheet), 📝 (store history), ⚠️ (product form, settings), 💱 (settings), 🎉 (debt paid), 💵📒 (payment type pills) | P3 | Open | — |
| B16 | Checkout | all | QA flow "mixed KHR+USD tender" | Pay part in ៛ and part in $ | Not supported: Checkout takes one currency at a time | P2 | **Open: new feature/logic, waiting for OK** | — |
| B17 | Checkout partial | all | QA flow "partial (with due date)" | Set a due date at checkout | Checkout has no due date; it can only be set later in Customer detail | P3 | **Open: feature gap, waiting for OK** | — |
| B18 | Tooling | — | `npm run lint` | Lint passes | No ESLint config; `next lint` starts an interactive setup | P2 | **Open: needs OK to add a config** | — |
| B19 | Count badge (`Pill variant="count"`) | all | Tab bar / rail badges | Contrast ≥ 4.5:1 | White on `#E5484D` = 3.9:1 | P3 | Open | — |
| B20 | Receipt / statement PNG (html2canvas) | all | Save receipt as image | Text centred in pills / boxes | Text is drawn ~5px lower than on screen (e.g. the "ជំពាក់" pill). Readable, not clipped | P3 | Open | — |
| B21 | Safe areas — `app/layout.tsx` viewport | iPhone standalone | Install as PWA | Insets handled | No `viewport-fit=cover`, so every `env(safe-area-inset-*)` is 0 and iOS letterboxes the page instead. Content is never under the notch, but the inset rules never activate | P3 | Open (decide whether to opt in) | — |
