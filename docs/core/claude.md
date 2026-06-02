# Claude Working Instructions

## Project Identity

Khmer-first, offline-first SaaS POS system for Cambodian small businesses. Every decision must hold up under: no internet, a phone screen, a Khmer-speaking user, and a rural shop context.

Before starting any session:
1. Read `context.md` — business goals and user profile.
2. Read `architecture.md` — technical constraints and module map.
3. Read `../temp/current-task.md` — what is in progress right now.

---

## Founder Context

- **Solo founder, product-led.** Builds and tests this system personally. Decisions should be practical and shippable, not theoretical.
- **Primary audience is rural Cambodian shop owners** — non-technical, Khmer-speaking, often a single cashier running the shop alone.
- **Real device testing is the norm.** The founder tests on a physical iPhone and iPad/tablet over LAN (`http://<lan-ip>:3000`) during daily-shop-style usage, not just in a desktop browser. Layout must hold up on a real handheld screen.
- **Bias toward "feels like a real, daily-use POS."** The founder repeatedly pushes for production-grade commercial feel over prototype/demo polish. Take that seriously in every UI decision.
- **MVP mode is acceptable.** The app must run and be testable even without the Supabase backend configured. Never let missing backend block local testing.

---

## Communication Rules (Khmer)

- **Reply in Khmer by default.** The founder communicates in Khmer; respond in clear, simple Khmer.
- Use plain, everyday Khmer — avoid overly formal or academic phrasing. Write the way a Cambodian shop owner would actually read comfortably.
- Technical terms (React, Tailwind, Supabase, KHR, component names, file paths, code) stay in English/Latin — do not translate them awkwardly.
- Keep summaries in Khmer, but keep code, identifiers, and commands in their original form.
- Be concise. Lead with what was done / what to do next, then details if needed.

---

## Non-Negotiable Constraints

These apply to every feature, every screen, every data model — no exceptions:

| Constraint | What it means in practice |
|---|---|
| **Khmer-first** | All UI labels, error messages, and placeholder text in Khmer Unicode. No English-only strings exposed to users. Number formatting follows Khmer locale (KH). |
| **Offline-first** | Every user action must complete locally first. Network is a sync channel, not a dependency. Never block a sale on connectivity. |
| **Mobile-first** | Design for a 390px wide screen before anything wider. Touch targets minimum 48×48px. No hover-only interactions. |
| **iOS + Android** | Code and UI must work on both platforms. Test assumptions against both. Avoid APIs or packages that are platform-exclusive. |
| **Touch-friendly** | Large buttons, swipe gestures where natural, minimal keyboard entry, numeric keypads over full keyboards for price/quantity inputs. |

---

## Feature Modules

These are the core domains. Understand them before touching related code.

### 1. Sales (លក់)
- Cart-based POS flow: scan or search item → add to cart → apply discount → collect payment → print/share receipt.
- Payment types: cash, debt (ជំពាក់), partial payment.
- Receipt must be shareable as image (for Telegram/Facebook — common in Cambodia).

### 2. Debt System (ប្រព័ន្ធបំណុល)
- Customer can be charged now, pay later.
- Every sale on debt creates a debt record linked to the customer.
- Debt ledger per customer: total owed, payment history, outstanding balance.
- Debt repayment is a separate transaction flow from sales.
- Never write off debt silently — every change must have an audit trail.

### 3. Inventory (ស្តុក)
- Products have: name (Khmer), barcode, unit (ដប/មេ/គីឡូ etc.), cost price, sell price, stock quantity.
- Stock decrements on every confirmed sale.
- Low-stock alerts configurable per product.
- Stock adjustments (manual corrections, losses) are logged with reason.

### 4. Barcode (បាកូដ)
- Barcode scanning via device camera — no external hardware assumed.
- Scan triggers product lookup; if not found, prompt to create new product.
- Support EAN-13, EAN-8, Code 128, QR fallback.
- Scanning must work in low-light (common in rural shops).

### 5. Reports (របាយការណ៍)
- Daily sales summary, top products, debt aging, inventory valuation.
- Reports run locally from local DB — no server required.
- Export as PDF or share as image.

### 6. Multi-Tenant SaaS
- Each business is a tenant. Data is strictly isolated.
- Tenant ID must be present on every data record at the schema level.
- Subscription tier controls feature access (e.g., multi-user, advanced reports).
- Sync is per-tenant — never mix data across tenants.

---

## Data & Sync Rules

- **Local DB is the source of truth for the device.** The cloud is a backup and cross-device sync target.
- Every write goes to local DB first, then joins a sync queue.
- Sync queue flushes when connectivity is detected.
- Conflict resolution: **last-write-wins by server timestamp**, unless the record is financial (sale, debt payment) — those are **append-only and never overwritten**.
- Deleted records use soft delete (`deleted_at` timestamp), never hard delete.
- All monetary values stored as **integers in Riel (KHR)**. No floats. No USD stored in DB (display conversion only if needed).

---

## Code Conventions

- UI strings: never hardcode English for user-facing text. All labels go through the i18n layer (Khmer default).
- Monetary display: format with Khmer locale, show ៛ symbol.
- Dates: display in Khmer locale; store as UTC ISO 8601.
- IDs: use UUIDs (v4) generated client-side so records can be created offline without server coordination.
- No floats for money — multiply by 100 and store as integer if sub-riel precision is ever needed.
- Prefer simple, flat data structures over deep nesting — easier to sync and serialize.

---

## Locked Design Direction

**Theme: Warm Commercial Minimal POS.** This direction is decided. Do not drift back to earlier (cooler/bluer) looks unless the founder explicitly changes it.

**Style — what it must feel like:**
- Khmer-friendly first.
- Warm neutral colors (warm off-white / stone greys, not cool slate-blue).
- Professional but friendly — a calm tool, not corporate-cold and not toy-like.
- Modern retail POS, minimal commercial UI.
- Tablet-first, iPhone-friendly.
- Calm and clean — comfortable for long daily usage (low eye strain, low visual noise).

**Avoid — hard nos:**
- Dark / cyberpunk UI.
- Gaming style.
- Overly futuristic UI.
- Too colorful.
- Too playful / cute / childish.

**Structure (carried over, still applies):**
- **Three-layer visual hierarchy:**
  1. App background — warm neutral surface (`--color-surface`), not white, not pastel, not cool-blue.
  2. Elevated surfaces — header, cart panel, bottom sheet (warm-tinted white).
  3. Cards — clean surface with a defined warm border + clear selected state.
- **Selected/active states must be obvious** — accent border + ring + in-cart quantity badge. The user must instantly see what's in the cart.
- **Strong price emphasis.** Price is the loudest element on a product card (large, extrabold, `tabular-nums`). Name and unit are secondary.
- **Shadows are soft but defined** (`--shadow-xs` → `--shadow-pop`), used to separate layers — not for decoration.
- **Rounded corners, generous tap spacing**, clean surfaces, no clutter. No unnecessary animations. No over-design.
- **Styling system:** Tailwind CSS v4, CSS-first via `@theme` in `globals.css` (no `tailwind.config.ts`). Use the design tokens (`--color-*`, `--shadow-*`, `--animate-*`) — don't hardcode one-off colors that duplicate an existing token. Warm neutrals come from the token layer so the whole app shifts together.

---

## POS UX Priorities

Ordered by importance. When two goals conflict, the higher one wins.

1. **Speed of a sale.** Add item → see total → take payment in the fewest taps. Never add friction to the core sell flow.
2. **One-hand / thumb reach.** On phone, primary actions (cart, checkout, pay) sit within thumb range at the bottom. Sticky checkout — total and pay button always reachable.
3. **Large tap targets.** Minimum 48×48px for primary controls; compact controls only where deliberate (`min-h-0 min-w-0`).
4. **See more products at once** without making cards cramped — dense but readable grid.
5. **Always-visible, unambiguous total.** The amount due is large and never hidden.
6. **Fast quantity edits** — stepper controls in the cart, no keyboard required for common changes.
7. **Operational "alive" feel** — store online status, shift/cashier identity, today's running sales total & count. The screen should feel like an active till, not an empty form.
8. **Clear empty & success states** — a useful empty cart (illustration + prompt) and an immediate, readable confirmation after each sale.

---

## Coding Behavior Rules

How to actually work in this repo:

- **Edit existing files; don't create new ones unless required.** No new docs/README files unless the founder asks.
- **Build exactly the current task.** No speculative features, no premature abstractions, no "while I'm here" rewrites.
- **Respect the money rules every time** — integer KHR only, never floats; format via the shared money helpers (`formatKHR`, `addKHR`, `multiplyKHR`, `toKHR`).
- **Never weaken financial integrity** — append-only for sales/debt/payments, soft delete only.
- **Security:** never expose `SUPABASE_SERVICE_ROLE_KEY` to the client; never commit `.env`.
- **Keep it runnable in MVP mode** — don't introduce a hard dependency on the backend for local testing.
- **Verify UI changes in the preview** before reporting done (real viewport, mobile + tablet), then restore the LAN dev server so the founder can test on-device.
- **All user-facing strings in Khmer Unicode** through the i18n layer — no English leaking into the UI.
- **Match the existing component patterns** (Tailwind v4 tokens, lucide-react icons, Zustand store selectors) instead of inventing parallel approaches.

---

## What Not to Do

- Do not block any UI action on a network call.
- Do not show English error messages to users.
- Do not use floating point for any price, cost, or payment value.
- Do not hard-delete financial records (sales, payments, debt transactions).
- Do not add a feature "for the future" — build exactly what the current task requires.
- Do not introduce a new abstraction layer without a concrete, immediate need.
- Do not assume the user has a physical barcode scanner — always use camera-based scanning.

---

## Session Hygiene

- Update `../temp/current-task.md` at the end of every session or when switching tasks.
- If you discover an architectural decision that isn't in `architecture.md`, add it there immediately.
- If a business rule is clarified during a session, update `context.md`.
