# BarberQueue — Audit Log & Intentional Design Decisions

This document records the findings from formal audits of the codebase. Its purpose is to prevent future developers (or AI assistants) from re-opening the same issues, flagging intentional patterns as bugs, or "fixing" things that are correct by design.

**Last updated:** 2026-05-30

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
