# Rural POS — UI Redesign (Design v2) — Implementation Prompt

You are redesigning the **visual layer only** of the Rural POS web app (`apps/web/`, Next.js 15 App Router, React 19, Tailwind CSS v4 `@theme` tokens, Zustand, Dexie). The goal is a completely new look and layout ("Design v2"). Every existing feature must keep working exactly as it does today.

Before you start, read `APP_AUDIT.md` at the repo root. All file paths below come from it.

---

## 0. Ground rules (read first, follow always)

**Do not change behavior.**
- Do NOT modify anything in these folders: `src/services/`, `src/store/`, `src/db/`, `src/sync/`, `src/lib/` (including `money.ts`), `src/types/`, `middleware.ts`.
- Do NOT rename or remove routes.
- Do NOT change the props or callbacks of feature components. The one exception: you may add an optional `className`.
- Do NOT change handlers, effects, or data flow. Markup and classes only.
- Keep these flows exactly as they are:
  - A debt sale requires a customer.
  - Each debt payment settles exactly one invoice.
  - "សង​ពេញ" (pay in full) asks for confirmation before it runs.
  - Every amount is an integer KHR value formatted with the existing `formatKHR` / `formatUSD` / `formatDual`.
- Keep the refs `cartBtnRef` and `cartPanelRef` in `POSScreen.tsx` attached to the new cart button and cart panel, so the fly-to-cart animation still works.
- Keep `SwipeRow` pointer and translate logic intact.
- Keep `receiptRef` (`SaleReceiptSheet.tsx`). Its DOM *is* the exported PNG and the printed output. See Phase 8.

**Text and language.**
- Keep all existing Khmer text, including the Khmer zero-width spaces (`​`).
- Any new UI text must be in Khmer.
- Do not wire up `next-intl` / `km.json`; that is out of scope.

**Dependencies.**
- No new npm dependencies.
- Load the font with `next/font/google`.
- Icons come from `lucide-react`, which is already installed. Replace emoji used as **UI icons** (categories, payment methods, buttons) with lucide icons. Product emoji is handled separately (see `ProductThumb`).

**Accessibility.**
- Keep the global 48px minimum touch target. Do not add new `min-h-0 min-w-0` overrides on tappable elements.
- Every icon-only button gets an `aria-label` in Khmer.
- Text contrast must be at least 4.5:1.

**Scope.** No dark mode. No new features.

**Workflow.**
1. Create the branch `redesign/v2`.
2. Work **one phase at a time** and make one commit per phase.
3. After each phase:
   - Run the project's typecheck, lint and build scripts (check `package.json`).
   - Fix any errors.
   - Check the UI at 390px wide and at 1180px wide (iPad landscape).
   - Then STOP and give me a short summary of the changed files and anything you were unsure about, before you start the next phase.

---

## 1. Design tokens (Phase 1)

Replace the palette in the `@theme` block of `app/globals.css`. Keep the existing `slate-*` override mapped onto the new neutrals so untouched screens still look coherent. Add the tokens below.

### Colors

| Token | Value | Use |
|---|---|---|
| `--color-ink-900` | `#0F1B2D` | Dark headers, nav rail, primary dark buttons, main text |
| `--color-ink-800` | `#1C2A40` | Cards and buttons on dark surfaces |
| `--color-ink-700` | `#34445C` | Borders and inactive bars on dark |
| `--color-ink-300` | `#A9B4C4` | Secondary text on dark |
| `--color-bg` | `#EEF1F5` | App background |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-surface-2` | `#F5F7FA` | Nested blocks inside cards |
| `--color-line` | `#E2E6EC` | Dividers |
| `--color-line-strong` | `#D3D9E1` | Input borders, dashed dividers |
| `--color-text` | `#0F1B2D` | Body text |
| `--color-text-subtle` | `#3E4A5C` | Labels |
| `--color-text-muted` | `#5A6676` | Meta / captions (minimum for text on white) |
| `--color-nav-off` | `#7A8696` | Inactive tab icons only |
| `--color-accent` | `#FFB020` | Marigold: main CTA, active states. **Text on accent is always `ink-900`, never white.** |
| `--color-success` / `--color-success-bg` / `--color-success-on-dark` | `#067A55` / `#DDF5EA` / `#6EE7B7` | Money in, change, discounts, "សងរួច" (paid) |
| `--color-debt` / `--color-debt-bg` / `--color-debt-on-dark` | `#B93815` / `#FFEBE2` / `#FF8A65` | Debt amounts, overdue |
| `--color-warn` / `--color-warn-bg` | `#8A5300` / `#FFF3D6` | Low stock, partial payment, due today |
| `--color-danger` / `--color-danger-bg` / `--color-badge` | `#B42318` / `#FDECEA` / `#E5484D` | Out of stock, destructive actions, count badges |
| `--color-chart-1…6` | `#6CB6FF #FFB020 #3DDC97 #C4A1FF #FF8A65 #A9B4C4` | Expense categories, payment-method splits |

**Product thumbnail tints.** Each product gets a background + ink pair, chosen deterministically from a hash of the product id:
`#FFF0D1/#8A5300`, `#F6F2CF/#6B6210`, `#E9EDF3/#3E4A5C`, `#DDEBFA/#24548A`, `#F5EAD2/#7E5A10`, `#FBE5D8/#97431A`, `#FDE3DC/#9C3A1E`, `#E3ECF8/#2A4B78`, `#EFE4DC/#5E3B2A`, `#E4F0DA/#46652A`

### Typography

- **Font:** replace Noto Sans Khmer with **Kantumruy Pro** (weights 400/500/600/700, subsets `khmer` + `latin`) via `next/font/google`. Keep the CSS variable name `--font-khmer` so existing usages keep working.
- **Line height:** base 1.45 (Khmer needs room for subscripts). Use 1.2 for large numbers.
- **Type scale tokens** (replace the arbitrary `text-[Npx]` values while you touch each file):

| Token | Size | Use |
|---|---|---|
| `--text-caption` | 12px | Smallest allowed. Badges and chips only |
| `--text-meta` | 13px | |
| `--text-body-sm` | 15px | |
| `--text-body` | 16px | |
| `--text-label-lg` | 17px | Buttons |
| `--text-title-sm` | 18px | |
| `--text-title` | 22px | Page title |
| `--text-title-lg` | 24px | |
| `--text-amount` | 28px | |
| `--text-amount-lg` | 34px | Hero amounts |
| `--text-amount-xl` | 44px | Checkout due / received |

- **No text below 12px anywhere.** Today there are 252 uses of ≤11px; bump them all as you go.

### Radius, shadow and size tokens

- **Radius:**

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 12px | Inner chips, stepper buttons |
| `--radius-md` | 16px | Buttons, inputs |
| `--radius-lg` | 20px | Cards, list rows |
| `--radius-xl` | 24px | Large cards, floating bars |
| `--radius-2xl` | 32px | Rounded bottom of dark headers, sheet tops |
| (pill) | 999px | Pills |

- **Shadow:**

| Token | Value |
|---|---|
| `--shadow-float` | `0 10px 30px rgba(15,27,45,.16)` (floating tab bar) |
| `--shadow-cartbar` | `0 12px 30px rgba(15,27,45,.35)` |
| `--shadow-fab` | `0 8px 20px rgba(15,27,45,.30)` |

  Cards use **no shadow**: white on `--color-bg`.
- **Heights:**

| Element | Height |
|---|---|
| Inputs | 50–54px |
| Secondary buttons | 48–52px |
| Primary CTA | 60–62px (iPad 62–70px) |
| Keypad keys | ≥56px |
| Stepper buttons | 40–44px |

- **Spacing:** page gutter 16px on phone, 24–28px on iPad. Gaps of 8 / 10 / 12 / 16.
- **Theme color:** in `app/layout.tsx`, set `themeColor` to `#0F1B2D`.

---

## 2. Off-token colors (Phase 2)

Replace the inline hex values listed in the audit with the new tokens or CSS variables. The files are:
- `SaleReceiptSheet.tsx`
- `ReportExportSheet.tsx`
- `CustomerDetailSheet.tsx`
- `ProductFormSheet.tsx`
- `FlyToCartOverlay.tsx`
- `app/layout.tsx`

**Exception:** `ReportExportSheet`'s popup HTML, receipt export and statement image must stay **print-friendly** (white background, ink text). Use the hex values of the new palette there, not CSS variables, because the popup has no stylesheet.

After this phase, verify that print, PNG export and share still work.

---

## 3. Shared primitives (Phase 3)

Restyle the existing `src/components/ui/*` components and add the missing ones. All of them must be **purely presentational** (no store access), typed, and use tokens only.

| Component | Spec |
|---|---|
| `Button` | Variants:<br>• `primary`: accent bg, ink text<br>• `dark`: ink-900 bg, white text<br>• `secondary`: white bg, ink text<br>• `onDark`: ink-800 bg, white text<br>• `dangerSoft`: danger-bg bg, danger text<br>• `dashed`: transparent, 2px dashed line-strong<br>Sizes `md` 48, `lg` 56, `xl` 62. Props: `icon`, `fullWidth`. |
| `IconButton` | 48×48, radius 16. Variants `light` (white) and `onDark` (ink-800). Requires an `aria-label` prop. |
| `Card` | White, radius 20–22, padding 12–16. Option `tone="muted"` uses surface-2. |
| `PageHeader` | `variant="light"`: back button + title + subtitle + right-side actions, on bg.<br>`variant="hero"`: ink-900 block with 32px rounded bottom corners, padding-top 56px on phone; `children` slot for hero content. |
| `Sheet` | ONE shell for all ~20 overlays.<br>• Phone: bottom sheet (top radius 28, 5px grab handle, close button `IconButton`, scrim `rgba(15,27,45,.5)`); supports `size="full"`.<br>• md+: centered modal, max-w 560–600, radius 28.<br>• Keeps the existing `sheet-up` animation.<br>• Props: `open`, `onClose`, `title`, `subtitle`, `footer`. |
| `SegmentedControl` | `tone="light"` (track `#DDE2EA`, active white) and `tone="dark"` (track ink-800, active accent with ink text). Items ≥42px tall. Uses `aria-pressed`. |
| `StatTile` | Label (13, muted) + value (17–19 bold) + optional sub. Light and on-dark versions (on dark: ink-800 bg). |
| `Badge` / `Pill` | Variants `success`, `debt`, `warn`, `danger`, `neutral`, `accent`, `count` (red circle, white 11–12px bold, min 18px). |
| `Stepper` | − qty +. Variants:<br>• `accent` (product card: accent track, minus = translucent ink, plus = ink-900 with white icon)<br>• `neutral` (cart row: bg track, minus white, plus ink-900)<br>• `onDark` (iPad cart: ink-800 track)<br>Buttons 40–44px. |
| `ProductThumb` | Shows the product **photo** if `imageUri` is set. Otherwise, if the product has a custom emoji (not the default `📦`), shows that emoji large on its tint. Otherwise shows the **first character of `nameKm`** in the tint ink (bold) on the tint background. Sizes 48 / 54 / 84px. |
| `LetterAvatar` | Customer photo or first letter. Tone depends on debt status: overdue = debt colors, due today = warn colors, otherwise neutral. |
| `MoneyText` | Main value via `formatKHR` + optional USD line via `formatUSD`. Sizes `md` / `lg` / `xl` / `hero`. Never reimplements formatting. |
| `ListRow` | Leading slot, title + meta, trailing slot, chevron option. Min height 56. Used as a white card row. |
| `Toggle` | 52×32 switch. On = ink-900 track. Rendered as a `button` with `aria-pressed`. |
| `NumericPad` | Restyle the existing component: 3×4 grid, keys ≥56px, radius 18, digits 26–30px. Keys `1–9`, `000`, `0`, backspace (lucide `Delete`).<br>• `tone="light"`: white keys on bg.<br>• `tone="dark"`: ink-800 keys on ink-900. |
| `ConfirmDialog` | Built on `Sheet`. Replaces the 2 copies in `CustomerDetailSheet`. |
| `EmptyState`, `SearchInput` | Restyle. `SearchInput`: white, radius 16, height 50–54, lucide `Search` icon; optional trailing scan button (accent, 52×52). |

---

## 4. App shell & navigation (Phase 4) — `app/(app)/layout.tsx`, `src/components/shared/*`

Routes stay the same. Only how the navigation is presented changes.

### Phone (< md): floating tab bar

- **Container:** absolute, 12px from the left/right edges and 20px from the bottom (plus safe-area inset); height 72; white; radius 26; `shadow-float`.
- **Five slots, in order:**
  1. ទំព័រដើម `/`
  2. ស្តុក `/inventory` (+ `/suppliers`). Badge = low-stock count.
  3. **លក់ `/sell`**: a raised center button, 66×66, radius 24, ink-900 background, accent grid icon, white label "លក់", 5px border in the bg color, offset up by 34px, `shadow-fab`.
  4. បំណុល `/debt` (+ `/customers`). Badge = debtor count.
  5. ច្រើនទៀត `/more` (+ `/reports`, `/receipts`, `/expenses`, `/settings`, `/staff`).
- **Styling:** active tab = ink-900 icon and label; inactive = `nav-off`. Labels 12px bold, icons 24px.
- **Reports (`/reports`)** stays a route. It is now reached from the More grid and from the "របាយការណ៍ →" link on Home.
- **On `/sell` (phone)**, hide the tab bar. The POS shows its own cart bar instead, and its header has a back button to `/`.
- Add bottom padding to the page content so the floating bar never covers content.

### md+ (iPad): left rail

- Ink-900 rail, 96px wide.
- Logo tile at the top: 50×50, accent background, first letter of the store name.
- Six items, each 78×68 with radius 20 and a 22px icon over a 12px label: ទំព័រដើម, លក់, ស្តុក, បំណុល, របាយការណ៍, ច្រើនទៀត.
- Active item = accent background with ink text. Inactive = `ink-300`.
- Count badges in the top-right corner of the item.
- Content takes the full remaining width; remove the `max-w-[430px]` behavior at md+.

Restyle `SyncStatusBar` and `PWAInstallBanner` with the tokens: a small pill/bar, not full-bleed blue.

---

## 5. POS (Phase 5) — `ProductCard`, `CategoryTabs`, `CartLineItem`, `CartPanel`, `POSScreen`

### Phone `/sell`

**Header (`PageHeader` hero, compact)**
- Row 1:
  - Back `IconButton` (onDark) → `/`
  - Title "លក់" + subtitle "វេនបើក · {cashier}"
  - Held-invoices button: onDark, pause icon, "ផ្អាក", plus an accent count badge
  - Shift `IconButton` (clock icon) → existing open/close shift sheets
- Row 2: white `SearchInput` + accent scan button → existing `BarcodeScannerSheet`

**Category bar.** `CategoryTabs` becomes a horizontal pill row on the bg, below the header.
- Pills are 44px tall. Active = ink-900 with white text; inactive = white.
- Show counts at 12px, 70% opacity.

**Product grid: 2 columns, gap 10** (changed from 3 columns, for bigger targets and long Khmer names).

`ProductCard`:
- White card, radius 22, padding 8.
- `ProductThumb`: 84px tall, radius 16, full width.
- Stock pill overlaid at the top-left:
  - Normal: "សល់ N", white 85% background, subtle text
  - Low: "ជិតអស់ · N", warn-solid background (`#8A5300`), white text
  - Out of stock: "អស់ស្តុក", danger-solid background, white text; the card is 50–60% opacity
- Name: 15px semibold, one line with ellipsis. Price: 17px bold (KHR).
- **In the cart:** a 2px accent ring around the card, and an accent `Stepper` replaces the add button.
- **Not in the cart:** a 48px "+ បន្ថែម" button with the bg color as background.
- Tapping the card still calls the same add handler, including the `onFly` animation.

**Cart bar.** Absolute at the bottom (12px from the sides, 20px from the bottom); height 74; ink-900; radius 26; `shadow-cartbar`. **This element gets `cartBtnRef`.**
- Left: ink-800 square showing the units count, with "ឯកតា" underneath.
- Center: total `MoneyText` in white 20px bold, plus "$x · N មុខ" in `ink-300`.
- Right: accent button "ទូទាត់ →".
- It opens `CartPanel`.

**`CartPanel` on phone:** use `Sheet size="full"` with the bg background.
- Header: "រទេះ" + "N មុខ · N ឯកតា", plus a clear button (danger icon).
- Dashed customer picker card: "ជ្រើសរើសអតិថិជន" with the hint "ចាំបាច់សម្រាប់ជំពាក់ ឬបង់ខ្លះ".
- `CartLineItem`, as a white card row:
  - `ProductThumb` 48px, name, line total (bold).
  - Line discount shown as a success pill "បញ្ចុះ −500 ៛"; when there is no discount, show the unit price × qty in muted text.
  - Neutral `Stepper`.
  - Keep the existing per-line discount and remove interactions; make the row tappable to open the existing line-discount UI if one exists.
- Two white buttons: "បញ្ចុះតម្លៃ" (order discount) and "ផ្អាកវិក្កយបត្រ" (hold).
- Footer: an ink-900 panel with a 32px top radius containing:
  - Subtotal; discount (in `success-on-dark`); total `MoneyText` (32px, white) with USD underneath.
  - Two onDark buttons, "ជំពាក់" and "បង់ខ្លះ".
  - A primary accent button "ទូទាត់សាច់ប្រាក់" (62px).
  - All of these call the existing `onPay(type)` / `onHold`.

### iPad `/sell` (md+)

Three columns next to the rail:
1. **Categories**: a white 196px column, title "ប្រភេទ", vertical buttons 54px tall. Active = ink-900 with white text. Count on the right.
2. **Catalog**: search + scan + held button in one row; product grid with 3 columns (auto-fill, minmax ~150px); same `ProductCard`.
3. **Cart**: a permanent ink-900 sidebar, 364px wide. **This element gets `cartPanelRef`.**
   - White text; dashed customer picker on dark.
   - Line rows divided by ink-800 lines, with the `onDark` Stepper.
   - Footer: totals; 3 onDark buttons (ជំពាក់ / បង់ខ្លះ / បញ្ចុះ); accent "ទូទាត់សាច់ប្រាក់".

### Success dialog (inline in `POSScreen`)

Make it a full-screen ink-900 view (phone) or a large modal (md+), containing:
- A 76px accent circle with a check icon.
- "លក់បានជោគជ័យ" and a summary line (paid amount and method).
- An ink-800 bar "អាប់ឲ្យភ្ញៀវ" showing the **change in a large accent number**. For debt or partial payments, show "នៅជំពាក់" in `debt-on-dark` instead.
- A white receipt preview card.
- Three onDark buttons: បោះពុម្ព / រក្សាទុករូប / ចែករំលែក. They call the existing receipt actions.
- An accent button "លក់បន្ត".

---

## 6. Simple screens (Phase 6)

Use the shared components. Do not touch any logic.

**Home `/`**
- Hero header:
  - Store tile (accent), store name, "វេនបើកតាំងពី HH:MM" with an accent dot, notification `IconButton`.
  - "ការលក់ថ្ងៃនេះ" in hero `MoneyText` (38px, white), with "$ · N វិក្កយបត្រ" underneath.
  - Three on-dark `StatTile`s: ចំណេញ / ចំណាយ / ជំពាក់ថ្មី. Only use values the page already computes; if "new debt today" is not available, show the debtor total instead.
- Quick actions: 4 round-square 62px tiles in one row. The first (លក់) is accent, the rest white.
- "ត្រូវធ្វើថ្ងៃនេះ": white task rows built from the existing low-stock and debt-due data:
  - Icon tile in warn / debt / ink colors.
  - A "close shift" reminder row, shown only when a shift is open.
- iPad: two-thirds-width hero + tasks column + 7-day bar chart + top products. Only use data the page already has; omit any card whose data is not available.

**More `/more`**
- Hero with the store tile, name and cashier.
- A 2-column grid of tiles (min height 112): របាយការណ៍, វិក្កយបត្រ, អតិថិជន, ចំណាយ, បុគ្គលិក (with a "ឆាប់ៗ" pill because it is a placeholder), ការកំណត់.
- A danger-soft "ចាកចេញ" button at the bottom, using the existing logout.

**Debt `/debt`**
- Hero: title + accent "អតិថិជន" add button.
- Big total debt `MoneyText` with the count of people.
- Three on-dark status tiles: ហួសថ្ងៃ / ដល់ថ្ងៃ / មិនទាន់. These act as the existing filters, each with a colored dot.
- Search; white customer rows: `LetterAvatar` with status tone, name, a due pill (e.g. "ហួស 2 ថ្ងៃ"), amount.

**Customers, Receipts, Expenses, Staff, Suppliers, Login, Inventory list**

| Screen | Spec |
|---|---|
| Receipts | Rows grouped by day, with the day total in the group header. Icon tile tinted by payment type. Type pill: សាច់ប្រាក់ = success, ជំពាក់ = debt, បង់ខ្លះ = warn. Voided = neutral with the amount struck through. |
| Expenses | Hero with the period `SegmentedControl` (dark; 4 options including ជ្រើសរើស). Total in `debt-on-dark`. A stacked category bar using `chart-1…6`. Grid of 6 category cards with color dots. History rows. A floating accent "ចំណាយថ្មី" button. |
| Inventory | Title + stock value. Scan `IconButton` + dark "ទំនិញថ្មី". **Three filter tiles** showing a big count + label (ទាំងអស់ dark / ជិតអស់ warn / អស់ស្តុក danger), driven by the existing filters. Search. Rows: `ProductThumb`, name, "សល់ N unit" colored by status, a 6px stock bar (ratio of stock to 3× the low threshold; green / amber / red), price/unit. Restock button: accent when low/out, neutral otherwise. Keep the link to `/suppliers`. |
| Login | Ink-900 top area with the accent logo tile, "Rural POS" and the tagline. Bottom white panel (top radius 32): email/password fields in filled style (bg background, radius 18, label inside), dark "ចូលប្រើ" button, divider "ឬ", accent "សាកប្រើ Demo Mode". Keep the logic that hides email/password when Supabase is not configured. |
| Staff, Suppliers | Restyle the placeholders with `EmptyState`. |

---

## 7. Sheets (Phase 7)

Migrate these to the shared `Sheet` one at a time, keeping their internals:
- Open / Close shift
- Held invoices
- Restock
- Expense form
- Customer form / edit / profile
- Backup
- Stock history
- Store history
- Barcode scanner (keep the zxing video element as is)

**Close shift** design:
- Hero: total sales and net profit (accent).
- Stacked bar: cash `#3DDC97` / ABA `#6CB6FF` / debt `#FF8A65`.
- White breakdown card with colored dots: opening cash, cash, ABA, debt (debt color), expenses (danger).
- "សាច់ប្រាក់គួរមានក្នុងថត" row.
- Counted-cash input; if there is already a comparison, show a warn banner such as "ខ្វះ 2,000 ៛".
- Dark "បិទវេន" button with an accent lock icon.

**Held invoices / Restock / Expense forms:** filled inputs (label inside, bg fill, radius 18), primary accent save button.

---

## 8. High-risk screens (Phase 8): markup only; handlers stay byte-for-byte equivalent

**`CheckoutSheet`**
- Phone: full-screen. iPad: a split page (left: due amount and options; right: an ink-900 panel with the keypad).
- Payment type: three large cards (សាច់ប្រាក់ / ជំពាក់ / បង់ខ្លះ) with lucide icons. Selected = ink-900 with an accent icon tile.
- Header: "ត្រូវបង់ 26,000 ៛ · $6.50" in `MoneyText`.
- Received amount, cash mode:
  - A ៛/$ `SegmentedControl` switches which existing tender field (KHR or USD) is being edited.
  - A large read-only display shows the value.
  - The restyled `NumericPad` writes to **the same state setters** the current inputs use.
  - Keep a real `<input>` for accessibility and hardware keyboards; `inputMode="none"` while the keypad is shown is fine.
- Quick-amount chips (ចំនួនពិត / 30,000 / 50,000 / 100,000 / $10 / $20): reuse the existing presets if there are any; otherwise these are only buttons that call the same setter.
- Change: success color, big ("ប្រាក់អាប់ 4,000 ៛ · $1.00").
- Partial mode:
  - Required customer card (with "ជំពាក់ស្រាប់ X ៛").
  - "បង់ឥឡូវ" amount.
  - A warn box with "នៅជំពាក់" and "ជំពាក់សរុបថ្មី".
  - Due-date chips +7 / +15 / +30, if checkout already supports a due date.
- Inline customer quick-add stays.
- Confirm button: "បញ្ចប់ការលក់" (dark with an accent check, or accent).

**`CustomerDetailSheet`** (full screen on phone)
- Hero: back button; share-statement and edit `IconButton`s; `LetterAvatar` (60px); name, phone and address; debt total in `debt-on-dark`, 34px; an overdue pill.
- An ink-800 row "ពន្យារថ្ងៃសង" with +7 / +15 / +30 buttons, using the existing due-date handlers.
- A light `SegmentedControl` switching between វិក្កយបត្រ and ប្រវត្តិបង់ប្រាក់.
- Open invoices: white rows with the amount, "#no · date", and an accent "សងពេញ" button. This keeps the existing pick-one-invoice → method → confirm flow, now through `ConfirmDialog`.
- Settled invoices: muted gray-blue background, with a success check "សងរួច".
- Payment history keeps `SwipeRow` swipe-to-void.
- Footer: dashed "បន្ថែមបំណុលចាស់" (manual / old debt).
- The statement image capture DOM stays print-friendly (white background).

**`ProductFormSheet`**
- Hero: `ProductThumb` (84px) with an accent camera button overlapping its corner, opening the existing camera/file picker; name, category and barcode; stock-status pill.
- Filled fields in a 2-column grid: name KM (full width), name EN, barcode (with `BarcodeScanMini`), category, unit, cost price, sell price, stock, low threshold. The stock field turns warn-tinted when stock is low.
- A success-tinted row "ចំណេញក្នុងមួយឯកតា" showing sell − cost and the percentage. This is display-only and computed from the form's existing values.
- Footer: a white "ស្តុក" button (stock history) and an accent "រក្សាទុក".

**`reports/page.tsx`**
- Hero:
  - Back button, "នាំចេញ" onDark button.
  - A dark `SegmentedControl` for ថ្ងៃនេះ / 7 ថ្ងៃ / 30 ថ្ងៃ.
  - Net profit in large type.
  - A mini bar chart using the existing per-day data (`ink-700` bars, today in accent). Skip the chart if there is no per-day data.
- Two `StatTile`s: income (success) and expenses (debt).
- A card with a `SegmentedControl` for លក់ដាច់ / លក់យឺត, showing ranked rows: rank, `ProductThumb`, name, qty, and an accent progress bar.
- A link row to `/receipts`.
- Do not move the aggregation logic.

**`settings/page.tsx`**
- An ink-900 store card with an accent "កែ" link.
- Two filled tiles: exchange rate ("$1 = 4,000 ៛") and cashier name.
- A white card "បង្ហាញលើវិក្កយបត្រ" with `Toggle`s for logo / address / phone / cashier, plus a row for the header/footer notes.
- Two tiles: backup / restore, and units.
- A danger-soft "លុបទិន្នន័យទាំងអស់" button (keep the existing confirmation).
- Settings rows with no `onClick` (user management, SaaS) stay non-interactive. Render them with a "ឆាប់ៗ" pill and do not make them look clickable.

**`SaleReceiptSheet` and `ReportExportSheet`**
- Only change the colors to the new hex palette and the font to Kantumruy Pro.
- Keep the layout structure, the 32-column text builder, and the white background.
- After changing them, test: on-screen preview, `window.print()`, PNG via html2canvas (check that the Khmer glyphs are not clipped; give the lines `line-height: 1.5`), and `navigator.share` text.

---

## 9. Final checklist (after Phase 8)

- [ ] Typecheck, lint and build all pass.
- [ ] No `text-[9px|10px|11px]` remains. `grep -rn "text-\[1[01]px\]\|text-\[9px\]\|text-\[7px\]"` returns nothing.
- [ ] No cool-gray Tailwind defaults (`#64748b`, `#94a3b8`, `#e2e8f0`, `#1e293b`) or old blue `#2563eb` remain outside of git history.
- [ ] Every sale path works at 390px and 1180px:
  - [ ] cash in KHR
  - [ ] cash in USD
  - [ ] mixed KHR + USD tender
  - [ ] debt (customer required)
  - [ ] partial
  - [ ] hold → resume
  - [ ] line discount
  - [ ] order discount
- [ ] Barcode scan, shift open/close, and the store history summary work.
- [ ] Debt payment works: pick invoice → method → confirm. Swipe-to-void works. The statement image exports.
- [ ] Fly-to-cart animation lands on the cart bar (phone) and the cart sidebar (iPad).
- [ ] Receipt print, PNG and share output render Khmer correctly.
- [ ] The tab bar never covers content; safe-area insets are respected on iOS.
- [ ] Every tappable element is ≥48px and every icon-only button has an `aria-label`.

At the end, give me:
- a list of the files changed per phase,
- anything you deliberately left unchanged and why,
- any place where the design needed data the app does not have (and what you showed instead).
