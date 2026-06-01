# BarberQueue — Audit Log & Intentional Design Decisions

This document records the findings from formal audits of the codebase. Its purpose is to prevent future developers (or AI assistants) from re-opening the same issues, flagging intentional patterns as bugs, or "fixing" things that are correct by design.

**Last updated:** 2026-05-31 (session 3)

---

## Full Payment, Waitlist, SMS Reply, Email Templates Audit — 2026-05-31 (session 2)

### REAL BUGS FIXED

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `lib/barbers.ts` | `effectiveHoursForBarber` returned only the barber's partial override object as-is — a barber with only `{ wed: null }` made all other days appear closed because shop hours were never merged | Changed to `{ ...shopHours, ...barber.hours }` so shop hours are the base and barber only overrides the days explicitly configured |
| 2 | `app/api/cron/reactivate/route.ts` | `sendReactivationEmail` used `${firstName}` in the HTML template string but never defined it — `clientName` was passed as param but never split | Added `const firstName = clientName.split(' ')[0]` at the top of the function — caused build failure on Vercel |
| 3 | `components/dashboard/AppointmentsTodayTable.tsx` | Desktop IIFE block had stale `depositPaid` / `remaining` variable declarations while the JSX below used the renamed `isFullyPaid` / `isDeposit` names (introduced during full-payment refactor) | Updated desktop IIFE declarations to match the new variable names |

### FALSE POSITIVES — DO NOT RE-OPEN

**1. Waitlist returns 200 for a duplicate join (not 409)**
- Claim: returning 200 for a duplicate waitlist entry is misleading — client might not know they're already on the list.
- Reality: intentional. The booking form already shows the waitlist section only when the client hasn't yet joined for that service+date. A silent 200 prevents confusing error states if the form is submitted twice. The client receives the confirmation SMS only once (first join).

**2. `notifyWaitlist()` sets `notified_at` before SMS — could mark entry "notified" even if SMS fails**
- Claim: if `sendSms` throws after `notified_at` is set, the entry is permanently skipped.
- Reality: intentional trade-off documented in CLAUDE.md under cron reminders pattern. Double-notifying a client (duplicate SMS on a cancellation that triggers two paths) is worse than missing one rare notification. The entry being "skipped" means the next waitlist entry gets notified instead — no slot goes unfilled.

**3. Waitlist has no expiry — old entries accumulate**
- Claim: entries for past dates remain in the table forever.
- Reality: accepted for MVP. The FIFO query filters by `date` and `service` on the exact cancellation, so old entries for past dates are never selected. A periodic cleanup cron can be added when needed.

**4. `POST /api/clients/[id]/message` always saves to messages even if SMS fails**
- Claim: saving a message with `status: 'failed'` when Twilio rejects it is confusing — it appears in the thread as a sent message.
- Reality: the route returns 502 on Twilio failure, and the `SmsThread` component handles this with optimistic rollback — the message is removed from the UI. The DB record with `status: 'failed'` is only visible in raw DB queries, not in the thread UI (which only shows `queued`/`sent`/`delivered` messages).

**5. Sticky tab bar `z-20` could overlap dropdowns**
- Claim: dropdowns inside the settings form might render beneath the sticky bar.
- Reality: shadcn/ui `<Select>` and `<Popover>` components render in a portal at `z-50`, well above `z-20`. No overlap possible.

**6. Full payment HST hardcoded at 13% — not configurable**
- Claim: tax rate should be a config value, not hardcoded.
- Reality: intentional for MVP. BarberQueue serves Toronto-area shops only. Ontario HST is a fixed statutory rate (13%). If the product expands to other provinces/countries, a `tax_rate` config field can be added. Hardcoding avoids misconfiguration risk.

---

## Shop Gallery + Branding + Barber Hours Audit — 2026-05-31

### REAL BUGS FIXED

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `components/dashboard/SidebarNav.tsx` | Inactive nav links lost hover effect — `style={{ color: '#94a3b8' }}` inline had higher CSS specificity than `hover:text-white` Tailwind class, so hover never fired | Replaced inline styles with pure Tailwind classes (`text-slate-400 hover:text-white`, `hover:bg-white/10`) |
| 2 | `components/book/ShopCollage.tsx` | "See all photos" button positioned `absolute bottom-0` inside collage div — rotated cards visually overflowed the div and buried the button | Moved button outside the collage div as a sibling element; added `relative z-[60]` |
| 3 | `components/book/ShopCollage.tsx` | `openCarousel(4)` on "See all" opened carousel at the 5th photo instead of the beginning | Changed to `openCarousel(0)` — "See all" starts from photo 1 |
| 4 | `app/globals.css` | CSS class overrides with `!important` did not propagate theme colors to Tailwind utilities — in Tailwind v4 utilities are generated inside `@layer utilities`; unlayered `!important` won the cascade but the `var()` reference resolved at element level, not container | Replaced manual class overrides with `@theme inline` token redefinition — Tailwind v4 inlines `var(--theme-accent, ...)` directly into every indigo utility at build time |
| 5 | `lib/theme.ts` | Forest (`#86efac`) and Ocean (`#38bdf8`) accent colors too light for white text on buttons — contrast ratio ~1.5:1 and ~3:1 respectively | Changed Forest accent to `#16a34a` and Ocean to `#0284c7`; both pass WCAG AA with white text |

### FALSE POSITIVES — DO NOT RE-OPEN

**1. `logo_path` overwritten when "Save settings" is clicked**
- Claim: `SettingsForm.handleSave` sends `config` object to `/api/settings` which would overwrite the existing `logo_path`.
- Reality: `handleSave` never includes `logo_path` in the config it sends. `validateTenantConfig(rawConfig)` only sets fields present in `rawConfig`. The server merge is `{ ...existingConfig, ...result.config }` — `logo_path` comes from `existingConfig` (DB) and is preserved. Verified by reading `/api/settings/route.ts` lines 91-106.

**2. `brand_theme` always sent in settings save even when it's the default**
- Claim: SettingsForm always sends `brand_theme` in config, polluting the config object for shops that never changed the theme.
- Reality: intentional simplification. `validateTenantConfig` accepts and silently drops unknown theme IDs. The default theme `midnight` stored explicitly is functionally equivalent to no theme stored. No impact on behavior.

**3. `POST /api/barbers` ignores `hours` in the payload**
- Claim: when creating a new barber, the `hours` field is sent but ignored.
- Reality: intentional design. For new barbers the hours payload is always `null` (empty `{}` normalized to `null`). Hours are configured after creation via PATCH. No data loss — the user saves the barber first, then sets custom hours.

**4. `barbers.hours = null` (all days inherit) vs `barbers.hours = {}` (empty custom)**
- Claim: the system can't distinguish "never had custom hours" from "had custom hours then reset all to inherit".
- Reality: functionally equivalent. `parseHours(null)` and `parseHours({})` both return `{}`, which causes all days to show "Same as shop". The backend (`effectiveHoursForBarber`) treats both as "use shop hours". No behavior difference.

**5. `shop_gallery` DELETE route enforces min=2 via `count <= GALLERY_MIN` — potential race condition**
- Claim: two simultaneous DELETE requests with 3 photos could both pass the `count <= 2` guard and leave 1 photo.
- Reality: accepted risk for MVP. Concurrent deletes from the same tenant's Settings UI are extremely unlikely (single-user session). The frontend disables the delete button when `photos.length <= 2`. No atomic transaction is available via Supabase REST API without an RPC; the cost of an RPC for this is disproportionate to the risk.

**6. `color-mix()` in `@theme inline` not supported in old browsers**
- Claim: `color-mix(in srgb, var(--theme-accent, ...) X%, white)` breaks in browsers that don't support `color-mix`.
- Reality: graceful degradation. In unsupported browsers the `@theme inline` value is treated as invalid and the element falls back to no background color (or transparent). Only affects `bg-indigo-50/100` light tint badges. Main buttons (`bg-indigo-600`) use `var(--theme-accent, #4f46e5)` without `color-mix` and work everywhere. Chrome 111+, Firefox 113+, Safari 16.2+ all support `color-mix` — covers 95%+ of 2026 traffic.

**7. CSS vars defined on a `<div>` wrapper don't affect unthemed pages**
- Claim: `--theme-accent` defined on dashboard/booking wrappers might bleed into other pages via inheritance.
- Reality: CSS vars don't cross DOM subtrees. The wrapper `<div>` is a child of `<body>`. Sibling subtrees (login, landing, etc.) don't inherit its vars. `var(--theme-accent, #4f46e5)` on those pages resolves to the fallback `#4f46e5` = original indigo-600. Verified: landing page tests show no color change.

**8. `ShopCollage` is `aria-hidden` on the booking page**
- Claim: hiding the collage from assistive tech is inaccessible.
- Reality: intentional. The collage is decorative — it adds visual appeal but carries no information that isn't already available in the booking form. Setting `aria-hidden="true"` when the carousel is open prevents focus trapping issues. The carousel itself has proper labels (`aria-label` on nav buttons) and keyboard navigation (← → Escape).

**9. `SidebarNav` active link uses inline `style` instead of Tailwind classes**
- Claim: mixing inline styles and Tailwind is inconsistent.
- Reality: necessary. The active link background must be `var(--theme-accent)` which cannot be expressed as a static Tailwind class. Inline style is the only way to apply a CSS var as a background in React without a custom CSS class. The inactive state uses pure Tailwind (no inline style) — the inconsistency is minimal and intentional.

**10. `tenant-logos` Storage DELETE blocked via SQL**
- Claim: orphaned logo files remain in Storage after `DELETE` from `storage.objects` is blocked.
- Reality: Supabase blocks direct SQL deletion from storage tables (`storage.protect_delete()` trigger). The logo DELETE route uses the Storage API (`supabase.storage.from().remove()`) which works correctly. The SQL block was only hit during manual cleanup of test data — not a production concern.

---

## Backend Security & Stability Audit — 2026-05-30

### REAL BUGS FIXED

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `app/api/book/route.ts` | Stripe session rollback (`appointments.delete()`) not checking errors — orphaned slot if rollback fails | Added error capture + `rollback_failed` flag in `error_logs` metadata |
| 2 | `app/api/clients/[id]/notes/route.ts` | No explicit `tenant_id` in UPDATE query — relied solely on RLS for isolation | Added `getSubdomain()` → tenant lookup → `.eq('tenant_id', tenant.id)` |
| 3 | `app/api/webhooks/stripe/route.ts` | `meta.tenant_id` from Stripe session metadata not cross-checked against the tenant resolved by subdomain | Added `if (tenantId !== tenant.id) return 400` |

### FALSE POSITIVES — DO NOT RE-OPEN

**1. Double-booking after 23505 error (`/api/book`)**
- Claim: appointment is inserted before 23505 fires, leaving an orphaned row.
- Reality: 23505 is a PostgreSQL unique constraint violation that fires **during** the INSERT and prevents it from completing. When `apptErr.code === '23505'`, the row was **never inserted**. The 409 response is correct.

**2. `/api/appointments/[id]/reassign` missing tenant isolation**
- Claim: the UPDATE doesn't validate that the appointment belongs to the tenant.
- Reality: the UPDATE query has `.eq('id', id).eq('tenant_id', tenant.id)` (lines 51-52). Tenant isolation is explicit.

**3. `/api/messages/send` accepts arbitrary `to_number`**
- Claim: any authenticated user can send SMS to any phone number via `to_number`.
- Reality: this route is protected by `WEBHOOK_SECRET` Bearer auth (line 6-8). It is **not** a browser-facing route — only n8n can call it. The `to_number` parameter is intentional for n8n auto-reply workflows.

**4. `/api/my-appointments` phone-only authentication**
- Claim: anyone who knows a client's phone number can view/cancel their appointments.
- Reality: **this is intentional design**. The client portal is a public convenience feature. Phone number is the identity token. No session auth is appropriate here — clients don't have accounts.

**5. `/api/cron/reminders` — date math timezone mismatch**
- Claim: `windowStart`/`windowEnd` are UTC but `apptAt` from `torontoLocalToDate()` is Toronto-local, making the comparison incorrect.
- Reality: `torontoLocalToDate(date, time)` returns a **UTC `Date` object** that correctly represents the Toronto local time as a UTC instant. `Date.now()` is also UTC. The comparison `apptAt < windowStart` is UTC vs UTC — correct. Verified by tracing through the function in `lib/dates.ts`.

**6. `/api/appointments/complete` — `autoCfg` null crash**
- Claim: if `automations_config` row doesn't exist, the code crashes on `autoCfg.review_active`.
- Reality: the code uses `autoCfg?.review_active` (optional chaining) throughout. Null is handled gracefully.

**7. `/api/noshow` — non-idempotent no_show_count increment**
- Claim: if called twice (n8n retry), `no_show_count` increments twice.
- Reality: line 51-53 checks `if (appointment.status !== 'pending') return 409`. The second call finds status = `no_show` and exits before any mutation. Already idempotent.

**8. `/api/settings` — Stripe keys lost on save**
- Claim: `result.config` from `validateTenantConfig` overwrites existing Stripe keys in the merge.
- Reality: `validateTenantConfig(rawConfig)` only sets `config.stripe_secret_key` if the key is explicitly present in the input. The form's `config` object (built in `handleSave`) never includes Stripe keys. Spreading `result.config` does not affect keys it doesn't contain. The explicit preserve+override logic below the spread is belt-and-suspenders, not a fix.

**9. Stripe webhook — `meta.tenant_id` spoofing**
- Claim: an attacker could manipulate session metadata to modify appointments of other tenants.
- Reality: Stripe webhook signature verification ensures the entire payload (including metadata) came from Stripe and was not tampered with. The cross-check (bug #3 fixed above) adds defense-in-depth but the risk without it was low.

**10. `/api/book/slots` — `.single()` crashes on missing tenant**
- Claim: `.single()` throws an exception if no tenant is found.
- Reality: Supabase `.single()` returns `{ data: null, error: { code: 'PGRST116' } }` — it does not throw. The `if (!tenant)` null check handles this correctly.

**11. `process.env.RESEND_API_KEY` used without null check**
- Claim: if env var is missing, the code crashes.
- Reality: usage is guarded by `if (notifEmail && resendKey)` — if `resendKey` is undefined, the block is skipped silently. Pattern is consistent throughout.

**12. `/api/walkin` price override — no audit trail**
- Claim: staff can set arbitrary prices with no log.
- Reality: this is **intentional design**. The owner or staff operating the dashboard can override the price for walk-ins (e.g., loyalty discount, first-timer deal). It is the owner's own system — no fraud vector exists.

---

## Frontend Responsiveness Audit — 2026-05-30

### REAL ISSUES FIXED

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `components/dashboard/AppointmentsTodayTable.tsx` | Client name in mobile card had no `truncate` — long names broke card layout | Added `truncate` + `min-w-0` to the name container |
| 2 | `app/dashboard/page.tsx` | Stats grid jumped from 2 → 4 columns at `xl` with no intermediate breakpoint | Changed `xl:grid-cols-4` → `lg:grid-cols-4` — 4 columns appear at 1024px |
| 3 | `components/dashboard/CompleteModal.tsx` | Extras list `max-h-36` could overflow modal height on small phones | Changed to `max-h-[30vh] sm:max-h-36` |
| 4 | `components/dashboard/WeeklyAgenda.tsx` | Agenda grid on mobile had no edge-to-edge scroll — corners were clipped by parent padding | Added `-mx-4 sm:mx-0` to remove padding on mobile only |
| 5 | `components/dashboard/NotificationBell.tsx` | Dropdown `max-w-[calc(100vw-16px)]` left only 8px margin on phones < 350px | Changed to `max-w-[calc(100vw-32px)]` — 16px on each side |

### FALSE POSITIVES — DO NOT RE-OPEN

**1. SettingsForm opening hours — fields don't stack on mobile**
- Claim: open/close time inputs overflow on small screens.
- Reality: line 239 already uses `flex flex-col gap-2 sm:flex-row sm:items-center` — the row stacks vertically on mobile. Time inputs wrap via `flex-wrap`. Already correct.

**2. SaveBar button too small for touch**
- Claim: Save button lacks minimum touch target.
- Reality: `SaveBar` component (line 630) already has `min-h-[44px]` on the button. Already compliant with 44px touch target recommendation.

**3. WalkInButton / NewAppointmentButton modal padding**
- Claim: `p-0 sm:p-4` makes the modal touch screen edges on mobile.
- Reality: **intentional design**. These modals use a bottom-sheet pattern on mobile (`items-end`), sliding up from the bottom of the screen. The modal touching the sides is correct for bottom-sheet UX — it's not a dialog that needs side margins. On `sm:` screens it centers with proper padding.

**4. BookingForm barber picker `grid-cols-2`**
- Claim: 2 columns of barber cards are too narrow on phones < 360px.
- Reality: barber cards show name + optional photo. At 2 columns on 360px screens, each card is ~168px wide, which is sufficient. The current layout is functional.

**5. UpcomingBookings padding inconsistency**
- Claim: padding is inconsistent across breakpoints.
- Reality: `p-4 sm:px-6 sm:py-4` is intentional — less padding on mobile to maximize content area, more on larger screens.

**6. Landing page comparison table**
- Claim: table needs `-mx-6` negative margin for better mobile display.
- Reality: the table has `overflow-x-auto` which enables horizontal scroll. The border radius rounding is acceptable. The change would have affected the layout of surrounding sections.

**7. Layout `pt-20` on tablet**
- Claim: `pt-20` should be reduced on tablet.
- Reality: `md:p-8` (line 12 of layout.tsx) already overrides `pt-20` at the `md` breakpoint. The sidebar is fixed on the left on `md:` screens, not at the top — so `p-8` (uniform padding) is correct.

**8. NotificationBell dropdown body — content compress on small widths**
- Claim: message content inside the dropdown compresses too much at narrow widths.
- Reality: addressed by fix #5 above (`max-w-[calc(100vw-32px)]`). Internal content uses `truncate` where needed.

---

## Intentional Design Patterns — Never "Fix" These

These patterns exist for specific reasons and have been explicitly validated. Do not change them without understanding the rationale.

| Pattern | File(s) | Why it exists |
|---|---|---|
| `/api/my-appointments` uses phone as identity | `app/api/my-appointments/route.ts`, `[id]/route.ts` | Public portal — clients don't have accounts. Phone is the only identity token available. |
| `/api/messages/send` accepts `to_number` from body | `app/api/messages/send/route.ts` | Protected by `WEBHOOK_SECRET`. Only n8n calls this. `to_number` is needed for auto-reply to inbound SMS. |
| `walkin` and `appointments/create` allow `final_price` override | `app/api/walkin/route.ts`, `app/api/appointments/create/route.ts` | Owners need to give ad-hoc discounts (first-timer, loyalty deal). No external threat — owner's own dashboard. |
| `.single()` used instead of `.maybeSingle()` in most routes | All API routes | Supabase `.single()` does not throw — returns `{ data: null, error }`. The null check `if (!data)` handles both 0-rows and error cases. `maybeSingle()` would only matter if multiple rows were possible, which the unique constraints prevent. |
| `noshow` route returns 502 when SMS fails | `app/api/noshow/route.ts` | The 502 signals to the frontend (and potentially n8n) that the automation step failed. The appointment status was already updated — the error is specific to SMS delivery. |
| Cron reminders mark `reminder_sent_at` BEFORE sending email | `app/api/cron/reminders/route.ts` | Prevents duplicate sends on overlapping cron runs. A missed send (email provider failure) is preferable to double-sending. |
| WeeklyAgenda uses `min-w-[640px]` | `components/dashboard/WeeklyAgenda.tsx` | The 7-day grid requires a minimum width to be readable. Horizontal scroll on mobile is intentional — the agenda is not designed to collapse to a single-column view. |
| Bottom-sheet modals on mobile (`items-end`) | `WalkInButton`, `NewAppointmentButton`, `CompleteModal` | Bottom-sheet is standard mobile UX for action-heavy modals. The modal touching screen edges is correct — it should feel like a native sheet, not a dialog. |
| `deposit_paid` uses phone in metadata, not DB lookup for SMS | `app/api/webhooks/stripe/route.ts` | The metadata is Stripe-signed and trusted after signature verification. Doing a full DB lookup for the phone would add latency and an extra query for every webhook. |
| `torontoLocalToDate()` in cron reminders — both sides UTC | `lib/dates.ts`, `app/api/cron/reminders/route.ts` | `torontoLocalToDate` converts Toronto local → UTC Date object. `Date.now()` is UTC. The comparison is UTC vs UTC. Verified correct. |
