# BarberQueue

Multi-tenant SaaS for independent barbershops in Toronto, Canada.
Each shop gets its own subdomain, private dashboard, and SMS automations.

**Price:** $19.99 USD/month · 7-day free trial

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind + shadcn/ui |
| Database | PostgreSQL via Supabase (RLS on all tables) |
| Auth | Supabase Auth — email/password (registration) + password login + password reset |
| SMS | Twilio |
| Email | Resend |
| Automations | n8n self-hosted on Railway |
| AI | OpenRouter (model-agnostic — n8n native integration) |
| Deploy | Vercel + Railway + Supabase |

---

## Subdomain routing

```
barberqueue.pro            → landing page + registration
barberqueue.pro/admin      → platform-owner admin dashboard (allowlisted)
[slug].barberqueue.pro     → barber's private dashboard
[slug].barberqueue.pro/book → public client booking
```

`proxy.ts` middleware detects the subdomain, guards auth, and injects `x-subdomain` into all requests.

---

## Local setup

```bash
npm install
npm run dev
```

Variables are in `.env` — all keys (Supabase, Twilio, Resend, n8n, OpenRouter) are filled in.

For local dashboard testing, open `http://test.localhost:3000` — the proxy resolves the `test` tenant from the real subdomain (Chrome/Edge resolve `*.localhost` automatically). Sign in at `http://test.localhost:3000/login`.

---

## Automations

| # | Trigger | Action | Status |
|---|---------|--------|--------|
| 1 | No-show marked | Recovery SMS to the no-show client | ✅ API ready |
| 2 | No-show marked | Flash discount email to inactive clients to fill the slot (Resend) | ✅ Complete |
| 3 | Appointment completed | Add loyalty points + notify level up | ✅ API ready |
| 4 | Weekly cron (n8n 02) | N+ day inactive clients → SMS + email (Resend) | ✅ Verified end-to-end |
| 5 | Appointment completed | Wait 30 min → review request SMS (n8n 01) | ✅ Verified end-to-end |
| 6 | Inbound SMS | AI auto-reply grounded in shop's `/settings` data (n8n 03) | ⚠️ End-to-end works, re-verify with new prompt |
| 7 | Every 30 min (n8n 04) | Email reminder N hours before appointment (Resend) | 📋 Built — n8n workflow not yet activated |

Each automation has an on/off toggle (and reactivation has a configurable day threshold) on `[slug].barberqueue.pro/automations`. Toggling **Loyalty points** off is enforced inside the `complete_appointment` RPC — appointments still complete and visits still record, but no points are awarded.

---

## Public booking

Every shop gets a public booking page at `[slug].barberqueue.pro/book` (linked from the dashboard with a copy-to-clipboard card and a downloadable QR code).

- Visitors don't sign in — they pick a service, date, and 30-min slot, and enter name + phone (+ optional email)
- The service dropdown is rendered from `tenant.config.services` — each entry shows `Name · $price` (e.g. `Classic Haircut · $40`). Shops with no services configured see "Online booking is not available yet" instead of the form
- `/api/book` re-validates the chosen service against the config and snapshots the canonical `price_cad` onto `appointments.price` — the price the customer agreed to flows into `visits.price` on completion, powering the dashboard's "Revenue this month" card
- Email is optional — if provided it's stored on the client record and used for Resend appointment reminders
- `app/api/book/slots` exposes taken times so the form hides occupied slots in real time
- A partial unique index on `appointments (tenant_id, date, time) WHERE status IN ('pending','completed')` prevents double-booking even under concurrent submits
- Rate limits: **10 bookings/min per shop**, **3 bookings/day per phone** (caps SMS-spend damage from abuse)
- Suspended shops (`plan = 'suspended'`) automatically reject new bookings — both the form and the API
- Confirmation SMS is best-effort: Twilio failures never block the booking; the outcome is persisted to `messages`
- Owner receives an email notification (via Resend) when a client books — configured via `notification_email` in `/settings`
- Dashboard `Upcoming bookings` card lets the owner cancel — cancel sends a courtesy SMS and frees the slot back up

---

## Shop settings

Each shop has its own `/settings` page where the owner enters the data the AI assistant uses to reply to customer SMS.

- **Opening hours** — per weekday: Not set / Open (open + close times) / Closed
- **Services & prices** — dynamic list (name + price in CAD), max 30 entries. Also drives the public booking dropdown
- **Address** — single line, quoted verbatim to customers asking where you are
- **Google review link** — used by the review-request SMS automation; stored in `automations_config.review_link` even though the UI sits next to address/hours
- **Notification email** — owner's email for receiving a Resend notification each time a client self-books online. Stored in `tenants.config.notification_email`
- **Appointment reminder** — toggle + hours-before input (1–72h). Controls `automations_config.reminder_active` and `reminder_hours`. The n8n workflow 04 cron calls `/api/cron/reminders` every 30 min to send Resend emails to clients who have an email address
- **QR code** — displayed below the settings form. Shows the shop's booking URL as a scannable QR code; owner can download as PNG for printing or sharing
- Stored in `tenants.config` (jsonb), validated via `lib/tenant-config.ts` (regex on times, bounds on prices, whitelisted fields). The Google link and reminder config go to `automations_config` in the same save
- Mobile-first form: stacked rows on phones, `min-h-[44px]` touch targets, `inputMode="decimal"` for prices, full ARIA labelling
- **AI grounding**: `/api/webhooks/twilio` forwards `tenants.config` as `shop_data` in the n8n payload. The AI Agent's system prompt instructs it to quote ONLY values found in `shop_data` and reply "I can't confirm — please call the shop" for anything missing. Empty config = AI never invents data
- Owner-scoped via RLS — even if the subdomain is spoofed in headers, the SELECT/UPDATE only sees the user's own tenant

## Automations dashboard

Each shop also has `/automations` — a control panel for the SMS automations described above.

- 5 toggles (No-show recovery / Flash discount / Loyalty points / Review request / Win-back inactive clients), each with on/off
- Win-back exposes a `reactivation_days` input (7–365) — controls how many days of inactivity trigger the SMS. Validated on the API and respected by the weekly cron per tenant
- `POST /api/automations` writes only the fields present in the payload (partial update), so the form survives schema growth
- All four automations were already wired in the API routes (`/api/noshow`, `/api/reviews/request`, `/api/cron/reactivate`); only `loyalty_active` needed a code change (added to the `complete_appointment` RPC) since the points flow is server-side

---

## Admin dashboard

Platform-owner panel at `barberqueue.pro/admin` for managing tenants without touching SQL.

- Access controlled by `ADMIN_USER_IDS` env var — a comma-separated allowlist of `auth.users.id` UUIDs. Allowlist is env-only by design: a SQL-level compromise can never promote a user to admin.
- Server-side guard in `app/admin/layout.tsx`: redirect unauthenticated visitors to `/login?next=/admin`, return `notFound()` for signed-in non-admins (so the URL doesn't leak).
- APIs re-check `isAdmin(user.id)` on every request — the layout guard alone is never trusted.
- Lists every tenant with: subdomain (clickable), shop name, owner email (joined via `auth.admin.listUsers`), plan badge, stats (clients / appointments / SMS sent), signup date.
- Inline edit of `twilio_number` with E.164 validation (`^\+\d{11,15}$`).
- Plan dropdown (`trial` / `active` / `suspended`) — `suspended` flips the public booking form to "Online booking is paused" instantly.
- Warns when a tenant has no Twilio number set (inbound SMS to that shop are dropped).

---

## Project status (2026-05-26)

| Module | Status |
|--------|--------|
| Foundation (Next.js, Supabase, Auth, middleware) | ✅ Complete |
| Dashboard (stats, appointments, clients, loyalty) | ✅ Complete — mobile-responsive |
| Auth (magic link, password login, password recovery) | ✅ Complete |
| SMS API routes (noshow, reactivate, reviews) | ✅ Complete |
| Public landing + registration flow | ✅ Complete |
| Public booking flow (`/book` + slot picker + cancel + dynamic services with prices) | ✅ Complete |
| Revenue tracking (price snapshot at booking → carried into visits on completion) | ✅ Complete |
| Legal pages (privacy, terms, refund) | ✅ Complete |
| Admin dashboard (`/admin` — tenant + plan + twilio_number management) | ✅ Complete |
| Shop settings (`/settings` — hours, services, address, Google review link, notification email, reminder config) | ✅ Complete |
| Automations dashboard (`/automations` — 5 toggles + reactivation days) | ✅ Complete |
| Flash discount automation on no-show (Resend email to inactive clients) | ✅ Complete — verified 2026-05-25 |
| QR booking code (downloadable PNG in `/settings`) | ✅ Complete |
| Walk-in queue (`WalkInButton` + `/api/walkin` — immediate revenue tracking, name/phone optional, supports extras) | ✅ Complete |
| Manual appointment creation (`NewAppointmentButton` + `/api/appointments/create`) | ✅ Complete |
| Weekly agenda view (`/agenda` — 7-column grid, week navigation) | ✅ Complete |
| Email capture in public booking form (optional, used for Resend reminders) | ✅ Complete |
| Owner notification email on new booking (Resend via `/api/book`) | ✅ Verified end-to-end |
| Appointment reminders by email (`/api/cron/reminders` + n8n workflow 04) | ✅ Built — n8n ✅ active in Railway. Resend untested |
| Password-only registration (`signUp+password` + `/api/register/create-tenant` — fixes Gmail scanner) | ✅ Complete |
| SMS notification bell (`NotificationBell.tsx` + Supabase Realtime + `messages.read_at`) | ✅ Complete |
| Extra perks at completion / walk-in (`CompleteModal.tsx` + `p_price_override` in RPC) | ✅ Complete |
| Deploy to Vercel — barberqueue.pro live | ✅ Complete |
| Supabase Auth URLs + Twilio webhook + Resend domain | ✅ All configured |
| n8n workflow 01 — review delay (30 min) | ✅ Verified end-to-end |
| n8n workflow 02 — reactivation cron | ✅ Verified end-to-end |
| n8n workflow 03 — AI auto-reply | ⚠️ Flow verified, re-verify with `shop_data` system message |
| n8n workflow 04 — appointment reminders | ✅ Active in Railway |

---

## Database

**Supabase project:** `gjefeiwsvcjroklvkbuk`

```bash
npx supabase db push           # apply migrations
npx supabase gen types typescript --project-id gjefeiwsvcjroklvkbuk > lib/supabase/types.ts
```

> After regenerating types, manually re-add `complete_appointment` and `user_owns_tenant` in the `Functions` section of `types.ts`.

See [ROADMAP.md](ROADMAP.md) for full details.
