# Business Context

## Who We Are Building For

Small retail shop owners in rural Cambodia — villages and district towns outside Phnom Penh. These are family-run general stores (ហាងទូទៅ), selling everyday goods: rice, instant noodles, drinks, household items, phone credit, and basic agri-inputs. The owner is usually also the only cashier, stockkeeper, and accountant.

Secondary users: small agri-input dealers, cooperative shops, and roadside pharmacies in rural districts.

---

## Current Business Problems

### 1. No Record-Keeping System
Most shops run entirely on memory and paper. Prices, stock levels, and customer debts live in the owner's head or in a handwritten notebook. When the owner is away, another family member runs the shop with no visibility into what was sold or what customers owe.

### 2. Debt Is Untracked and Frequently Lost
Debt to regular customers is the norm, not the exception. Owners extend credit to neighbors and farmers daily. Without a system:
- Debts are recorded in a paper notebook that gets lost, damaged by rain, or forgotten.
- Customers sometimes claim they already paid when they haven't.
- The owner cannot recall which customers owe what without flipping through pages.
- Partial payments are especially hard to track — the notebook entry gets crossed out and a new one written, losing history.
- At month-end, owners often undercount what they are owed by 10–30%.

### 3. Inventory is Invisible
Owners do not know their real stock levels. They over-order some items and run out of others unexpectedly. Without tracking:
- Products expire or go to waste unnoticed.
- Profit margin is unknown because cost prices are not systematically recorded.
- Theft or shrinkage is invisible.

### 4. Pricing Inconsistency
Without a system, prices vary by who is serving. A teenage family member might charge differently than the owner. Discounts are given informally with no record.

### 5. No Business Insight
Owners cannot answer: "What are my 10 best-selling products this month?" or "How much did I earn last week?" All decisions are intuition-based.

---

## Debt Workflow (How It Actually Works Today)

Understanding this is critical — the debt feature must mirror real behavior, not impose foreign process.

**Typical debt lifecycle:**

1. Regular customer (neighbor, farmer, local worker) comes to buy goods.
2. Owner knows them by face. Customer says "ជំពាក់ជាមុន" (charge me, I'll pay later).
3. Owner adds the items, states the total aloud, writes it in the notebook next to the customer's name.
4. Customer leaves. No receipt. No signature.
5. Customer comes back days or weeks later. They might pay in full, or pay part ("បង់ខ្លះ"), or buy more and add to the existing debt.
6. Owner crosses out the old number, writes the new balance.
7. When fully paid, the entry is crossed out or torn out.

**Problems our system must solve from this workflow:**
- A customer's debt accumulates across multiple visits — the system must support running balances, not just individual sale debts.
- Partial payments are common and must be tracked with date and amount.
- The owner must be able to show a customer their full debt history to resolve disputes.
- Some customers have multiple family members who all charge to one "household account."
- The shop owner must be able to print or share a debt summary to collect from a customer.

**Social sensitivity:** Debt is a trust relationship. The UI must never feel confrontational. Labels like "customer owes" should use neutral Khmer phrasing, not language that implies accusation.

---

## Offline and Internet Reality

### Connectivity Situation
- Rural Cambodia has patchy 4G via Cellcard, Smart, or Metfone. Coverage exists in district towns but is weak or absent in many villages.
- Many shops have no home Wi-Fi. The owner's phone data is the only internet access.
- Connectivity drops unpredictably — mid-sale outages are common.
- Power outages also occur, especially during rainy season.

### What This Means for the App
- The app must be fully functional with zero connectivity. A sale must be completable, a debt must be recordable, and a product must be searchable even when the phone shows "No Signal."
- The user must never see a loading spinner that blocks action. If data is unavailable from server, show local data.
- Sync happens silently in the background when signal returns. The user should not need to press "sync" — it should be automatic.
- The app must handle the case where the user has been offline for days: all local records must sync correctly without data loss or duplication when they reconnect.
- Sync status indicator is useful for the owner (so they know data is backed up) but must never interrupt workflow.

---

## User Skill Level

### Digital Literacy Profile
- Age range of typical owner: 25–55.
- Smartphone usage: moderate. Owners use Facebook, Telegram, TikTok, and phone banking (KHQR, ABA, Wing) daily. They are comfortable with apps that look familiar.
- However: they have never used a POS system or business management software. Concepts like "inventory adjustment," "report export," or "sync status" are foreign.
- Some owners are minimally literate in Khmer. Iconography and visual cues matter as much as text labels.
- English: near zero. All UI must be in Khmer. Any English word (even in error messages or technical prompts) creates confusion and distrust.

### What Users Can Do Confidently
- Tap, scroll, swipe on a phone.
- Take photos and share via Telegram/Facebook.
- Scan QR codes (they use KHQR daily for payments).
- Type Khmer on a phone keyboard (Google Keyboard Khmer layout).

### What Users Cannot Handle
- Multi-step flows with more than 3–4 taps to complete a common action.
- Technical error messages ("sync failed: 409 conflict").
- Forms with many fields — they will abandon the app if onboarding is too long.
- Any UI that requires reading dense text to understand.

### Design Principle from This
Every primary action (make a sale, add a debt payment, check stock) must be achievable in under 4 taps from the home screen. The UI should feel like a smart version of what they already do on paper.

---

## Rural Shop Daily Workflow

Understanding a typical shop day helps ensure the app fits real patterns, not assumed ones.

**Morning (6:00–8:00am)**
- Owner opens the shop.
- Early customers buy breakfast items: instant noodles, bread, drinks, phone credit.
- Transactions are fast — 30 seconds per customer. Speed is critical.
- Some customers pay now, some ask to charge to their account.

**Midday (11:00am–1:00pm)**
- Quieter period. Owner might restock shelves, check what's running low.
- Sometimes checks what debts are due from farmers who just received wages.

**Afternoon (3:00–6:00pm)**
- Busy period again. Students and workers stop by.
- Mix of cash and debt transactions.
- Owner might receive a product delivery and update stock.

**Evening (6:00–8:00pm)**
- Slower. Some debt repayments come in (farmers pay after selling produce).
- Owner reviews the day's sales mentally or on paper — this is where daily summary feature has high value.

**Implications for the app:**
- Speed of a cash sale must be the top priority — no unnecessary steps.
- Debt repayment must be accessible from the home screen in 1–2 taps.
- End-of-day summary should be auto-generated, not manually triggered.
- Product delivery / stock update is a secondary workflow that can be slightly more steps.

---

## Touch-Screen Usage Patterns

### Device Context
- Primary device: Android smartphone, 6–6.7" screen, often with a cracked or scratched screen.
- Secondary: iPhone (growing among younger owners, especially iPhone SE and iPhone 13).
- Tablets: rare in this market — do not design for tablet as primary.
- The phone is handled with one hand most of the time — the other hand is handling goods, cash, or a bag.

### Touch Behavior
- Users tap with their thumb, one-handed, in the center and lower portion of the screen.
- Reach zones matter: primary actions must be in the bottom 60% of the screen (thumb-reachable).
- Small buttons, especially in the top corners, get missed or accidentally triggered.
- Users frequently tap the wrong item when buttons are close together — minimum spacing 12px between interactive elements, minimum touch target 48×48px.
- Users do not read — they scan visually and tap the largest/most prominent element they see.

### Input Preferences
- Prefer number pads over full keyboards for price and quantity entry.
- Prefer product search by photo/barcode over typing a product name.
- Swipe to delete or swipe to reveal actions is intuitive (they use it in Telegram).
- Long-press for secondary actions is acceptable but must be discoverable with a visual hint.

### Barcode Scanning in Practice
- Users will hold the phone over a product barcode — camera must activate fast (under 1 second).
- Lighting in rural shops is often dim (fluorescent or LED, sometimes none in back areas).
- The scan should give haptic feedback (vibration) and an audible beep — the user is looking at the product, not the screen.
- If scan fails, fall back immediately to manual search — do not leave the user stuck on a blank camera screen.

---

## Business Model Context

- Subscription fee must feel affordable relative to local income. Rural shop monthly revenue: ~$200–$800 USD equivalent in KHR.
- Price anchoring: owners currently pay nothing for a paper notebook. The app must demonstrate clear value quickly.
- Free trial or freemium entry point is important for adoption in this market.
- Payment via KHQR, Wing, or ABA is expected — Cambodian business owners do not use international credit cards.
- Subscription reminders must be in Khmer and delivered via push notification or Telegram bot — email is rarely checked.

---

## What Success Looks Like for the Owner

After 30 days of using the app, the owner should be able to say:

- "I know exactly which customers owe me money and how much."
- "I know when I'm running low on stock before I run out."
- "I can see how much I earned today without counting by hand."
- "I never lost a sale because the app was offline."
- "My family member can run the shop when I'm away and I can check everything on my phone."
