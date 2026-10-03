# Known Issues

Tracked bugs that are understood but intentionally **not** being fixed yet.

---

## BUG-AUTH-001 — Demo mode logs the user out after the 24-hour cookie expires

- **Status:** Open · fix deferred (founder wants to build other features first)
- **Severity:** Low (annoyance) — **no data loss**
- **Reported:** 2026-07-13

### Summary
In Demo mode (the current Vercel deployment, which has no `NEXT_PUBLIC_SUPABASE_*`
env vars), returning to the app after ~24 hours redirects the user to `/login`.

### Root cause
Access in Demo mode is gated by a single cookie, `pos-demo-session=1`, set at
demo login with `max-age=86400` (24 hours, **absolute** — from login time, not a
sliding/inactivity window). The middleware redirects to `/login` whenever that
cookie is absent. Nothing re-issues the cookie on app open or navigation, and the
persistent `pos-auth` flag in localStorage never expires but is server-side
invisible to the middleware — so the cookie's 24h expiry wins.

### Affected files
- `apps/web/app/(auth)/login/page.tsx` (line ~86 — sets the 24h cookie)
- `apps/web/middleware.ts` (line ~13 — the demo cookie gate)
- Related: `apps/web/src/store/auth.store.ts` (persistent localStorage auth)

### Risk to user data
None. Logout never touches IndexedDB (`pos-db`); all products / sales / customers
/ debt survive. Re-login via Demo Mode makes no network call, so it works offline
and restores the same tenant's data.

### Simplest safe fix (when approved)
Extend the demo cookie lifetime to the browser max (~400 days,
`max-age=34560000`) — a one-line change in `login/page.tsx`. Optionally re-issue
the cookie from middleware on each visit for a sliding window. No schema/design
changes. Complexity: Small.
